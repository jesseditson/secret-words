import { NowRequest, NowResponse } from "@now/node";

export default async (req: NowRequest, res: NowResponse) => {
  const data = { hello: "Hello world!" };
  return res.end(JSON.stringify(data));
};
