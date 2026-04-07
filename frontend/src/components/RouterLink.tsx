import { Link as ReactRouterLink, type LinkProps as ReactRouterLinkProps } from "react-router-dom";

type RouterLinkProps = Omit<ReactRouterLinkProps, "to"> & {
  href: string;
};

export function Link({ href, ...props }: RouterLinkProps) {
  return <ReactRouterLink to={href} {...props} />;
}
