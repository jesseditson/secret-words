import fetch from "isomorphic-unfetch";
import { IncomingHttpHeaders } from "http";

enum HTTPMethod {
  POST = "POST",
  PUT = "PUT",
  GET = "GET",
  DELETE = "DELETE",
}

export const isomorphicFetcher = (headers: IncomingHttpHeaders = {}) => async (
  path: string,
  data?: { [key: string]: string },
  method?: HTTPMethod
) => {
  let apiUrl = path;
  const config: RequestInit = {
    method: method || (data ? "POST" : "GET"),
    body: data ? JSON.stringify(data) : undefined,
  };
  if (!process.browser) {
    const forwarded = headers["x-forwarded-host"];
    const proto = headers["x-forwarded-proto"];
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    apiUrl = forwarded
      ? `${proto}://${forwarded}${path}`
      : `${protocol}://${headers.host}${path}`;
    const cookie = headers["cookie"];
    if (cookie) {
      config.headers = [["cookie", cookie]];
    }
  }
  const response = await fetch(apiUrl, config);
  return response.json();
};
export default isomorphicFetcher();
