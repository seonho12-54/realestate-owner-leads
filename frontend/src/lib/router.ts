import { useNavigate } from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();

  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    refresh: () => window.location.reload(),
  };
}
