#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import mimetypes
import os
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse

import boto3
import pymysql
import psycopg
import requests
from psycopg import sql
from psycopg.types.json import Jsonb
from pymysql.cursors import DictCursor

TABLE_ORDER = [
    "offices",
    "users",
    "admins",
    "leads",
    "lead_photos",
    "audit_logs",
    "location_verification_logs",
    "phone_verification_challenges",
    "support_inquiries",
]

BOOLEAN_COLUMNS = {
    "offices": {"is_active"},
    "users": {"location_locked", "is_active"},
    "admins": {"is_active"},
    "leads": {"location_verified", "privacy_consent", "marketing_consent", "is_published"},
    "location_verification_logs": {"success"},
    "support_inquiries": {"is_secret"},
}

JSON_COLUMNS = {
    "audit_logs": {"payload_json"},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Copy MySQL + S3 data into Supabase Postgres + Storage.")
    parser.add_argument("--env-file", required=True, help="Path to the current app env file that still points at MySQL/S3.")
    parser.add_argument("--schema", default="db/supabase_schema.sql", help="Path to the PostgreSQL schema file.")
    parser.add_argument("--skip-db", action="store_true", help="Skip the database copy.")
    parser.add_argument("--skip-storage", action="store_true", help="Skip the storage copy.")
    return parser.parse_args()


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        if line.startswith("export "):
            line = line[len("export ") :].strip()

        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key.strip()] = value

    return values


def merged_env(env_file_values: dict[str, str]) -> dict[str, str]:
    merged = dict(env_file_values)
    for key, value in os.environ.items():
        if value:
            merged[key] = value
    return merged


def require(env: dict[str, str], name: str) -> str:
    value = env.get(name, "").strip()
    if not value:
        raise SystemExit(f"Missing required setting: {name}")
    return value


def parse_mysql_jdbc_url(jdbc_url: str) -> tuple[str, int, str]:
    normalized = jdbc_url[5:] if jdbc_url.startswith("jdbc:") else jdbc_url
    parsed = urlparse(normalized)
    database = parsed.path.lstrip("/")
    if not parsed.hostname or not database:
        raise SystemExit(f"Could not parse MySQL JDBC URL: {jdbc_url}")
    return parsed.hostname, parsed.port or 3306, database


def normalize_postgres_url(url: str) -> str:
    normalized = url[5:] if url.startswith("jdbc:") else url
    return normalized if "sslmode=" in normalized else normalized + ("&" if "?" in normalized else "?") + "sslmode=require"


def connect_mysql(env: dict[str, str]):
    host, port, database = parse_mysql_jdbc_url(require(env, "SPRING_DATASOURCE_URL"))
    return pymysql.connect(
        host=host,
        port=port,
        user=require(env, "SPRING_DATASOURCE_USERNAME"),
        password=require(env, "SPRING_DATASOURCE_PASSWORD"),
        database=database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False,
    )


def connect_postgres(env: dict[str, str]):
    return psycopg.connect(normalize_postgres_url(require(env, "SUPABASE_DB_URL")))


def execute_schema(pg_conn: psycopg.Connection[Any], schema_path: Path) -> None:
    print(f"[schema] applying {schema_path}")
    schema_sql = schema_path.read_text(encoding="utf-8")
    with pg_conn.cursor() as cursor:
        cursor.execute(schema_sql)
    pg_conn.commit()


def truncate_target(pg_conn: psycopg.Connection[Any]) -> None:
    print("[db] truncating target tables")
    with pg_conn.cursor() as cursor:
        cursor.execute(
            """
            TRUNCATE TABLE
              lead_photos,
              leads,
              support_inquiries,
              phone_verification_challenges,
              location_verification_logs,
              audit_logs,
              admins,
              users,
              offices
            RESTART IDENTITY CASCADE
            """
        )
    pg_conn.commit()


def fetch_table(mysql_conn, table: str) -> list[dict[str, Any]]:
    with mysql_conn.cursor() as cursor:
        cursor.execute(f"SELECT * FROM {table} ORDER BY id ASC")
        return list(cursor.fetchall())


def transform_value(table: str, column: str, value: Any) -> Any:
    if value is None:
        return None

    if column in BOOLEAN_COLUMNS.get(table, set()):
        return bool(value)

    if column in JSON_COLUMNS.get(table, set()):
        if isinstance(value, (dict, list)):
            return Jsonb(value)
        if isinstance(value, (bytes, bytearray)):
            value = value.decode("utf-8")
        if isinstance(value, str):
            stripped = value.strip()
            return Jsonb(json.loads(stripped)) if stripped else None

    return value


def insert_rows(pg_conn: psycopg.Connection[Any], table: str, rows: list[dict[str, Any]]) -> None:
    print(f"[db] {table}: {len(rows)} rows")
    if not rows:
        return

    columns = list(rows[0].keys())
    statement = sql.SQL("INSERT INTO {} ({}) VALUES ({})").format(
        sql.Identifier(table),
        sql.SQL(", ").join(sql.Identifier(column) for column in columns),
        sql.SQL(", ").join(sql.Placeholder() for _ in columns),
    )

    with pg_conn.cursor() as cursor:
        for row in rows:
            cursor.execute(statement, [transform_value(table, column, row[column]) for column in columns])
    pg_conn.commit()


def reset_sequences(pg_conn: psycopg.Connection[Any]) -> None:
    print("[db] resetting identity sequences")
    with pg_conn.cursor() as cursor:
        for table in TABLE_ORDER:
            cursor.execute(
                f"""
                SELECT setval(
                  pg_get_serial_sequence('{table}', 'id'),
                  COALESCE((SELECT MAX(id) FROM {table}), 1),
                  COALESCE((SELECT MAX(id) FROM {table}), 0) > 0
                )
                """
            )
    pg_conn.commit()


def ensure_bucket(env: dict[str, str]) -> None:
    supabase_url = require(env, "SUPABASE_URL").rstrip("/")
    service_role_key = require(env, "SUPABASE_SERVICE_ROLE_KEY")
    bucket = require(env, "SUPABASE_STORAGE_BUCKET")
    public_bucket = env.get("SUPABASE_PUBLIC_BUCKET", "true").strip().lower() != "false"

    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
    }

    response = requests.get(f"{supabase_url}/storage/v1/bucket", headers=headers, timeout=30)
    response.raise_for_status()
    existing = response.json()
    if any(item.get("id") == bucket for item in existing):
        print(f"[storage] bucket '{bucket}' already exists")
        return

    response = requests.post(
        f"{supabase_url}/storage/v1/bucket",
        headers={**headers, "Content-Type": "application/json"},
        json={"id": bucket, "name": bucket, "public": public_bucket},
        timeout=30,
    )
    if response.status_code not in (200, 201, 409):
        raise RuntimeError(f"Failed to create Supabase bucket: {response.status_code} {response.text}")

    print(f"[storage] created bucket '{bucket}'")


def normalize_storage_key(key: str, prefix: str) -> str:
    normalized = key.lstrip("/")
    if prefix and normalized.startswith(prefix.rstrip("/") + "/"):
        return normalized[len(prefix.rstrip("/")) + 1 :]
    return normalized


def upload_supabase_object(env: dict[str, str], object_path: str, content: bytes, content_type: str) -> None:
    supabase_url = require(env, "SUPABASE_URL").rstrip("/")
    service_role_key = require(env, "SUPABASE_SERVICE_ROLE_KEY")
    bucket = require(env, "SUPABASE_STORAGE_BUCKET")
    encoded_path = quote(object_path, safe="/")

    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "x-upsert": "true",
        "Content-Type": content_type,
    }

    post_response = requests.post(
        f"{supabase_url}/storage/v1/object/{bucket}/{encoded_path}",
        headers=headers,
        data=content,
        timeout=180,
    )
    if post_response.status_code in (200, 201):
        return

    put_response = requests.put(
        f"{supabase_url}/storage/v1/object/{bucket}/{encoded_path}",
        headers=headers,
        data=content,
        timeout=180,
    )
    if put_response.status_code not in (200, 201):
        raise RuntimeError(
            f"Failed to upload '{object_path}' to Supabase Storage: "
            f"{put_response.status_code} {put_response.text}"
        )


def copy_storage(env: dict[str, str]) -> None:
    bucket = require(env, "S3_BUCKET")
    region = env.get("S3_REGION", "ap-northeast-2")
    prefix = env.get("S3_UPLOAD_PREFIX", "leads").strip().strip("/")
    s3_client = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=require(env, "AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=require(env, "AWS_SECRET_ACCESS_KEY"),
    )

    paginator = s3_client.get_paginator("list_objects_v2")
    total_objects = 0

    for page in paginator.paginate(Bucket=bucket, Prefix=(prefix + "/") if prefix else ""):
        for item in page.get("Contents", []):
            key = item["Key"]
            if key.endswith("/"):
                continue

            object_data = s3_client.get_object(Bucket=bucket, Key=key)
            body = object_data["Body"].read()
            content_type = object_data.get("ContentType") or mimetypes.guess_type(key)[0] or "application/octet-stream"
            target_path = normalize_storage_key(key, prefix)

            upload_supabase_object(env, target_path, body, content_type)
            total_objects += 1
            print(f"[storage] copied {key} -> {target_path}")

    print(f"[storage] copied {total_objects} object(s)")


def copy_database(mysql_conn, pg_conn: psycopg.Connection[Any]) -> None:
    truncate_target(pg_conn)
    for table in TABLE_ORDER:
        insert_rows(pg_conn, table, fetch_table(mysql_conn, table))
    reset_sequences(pg_conn)


def main() -> None:
    args = parse_args()
    env_path = Path(args.env_file).expanduser()
    schema_path = Path(args.schema).expanduser()

    env = merged_env(read_env_file(env_path))

    ensure_bucket(env)

    mysql_conn = connect_mysql(env)
    pg_conn = connect_postgres(env)

    try:
        execute_schema(pg_conn, schema_path)
        if not args.skip_db:
            copy_database(mysql_conn, pg_conn)
        if not args.skip_storage:
            copy_storage(env)
    finally:
        mysql_conn.close()
        pg_conn.close()

    print("[done] Supabase migration finished")


if __name__ == "__main__":
    main()
