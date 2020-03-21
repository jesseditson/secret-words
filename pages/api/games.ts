import { NowRequest, NowResponse } from "@now/node";

export interface GameWorker {
  name: string,
  id: string
}

export default async (req: NowRequest, res: NowResponse) => {
  const data: {games: GameWorker[]} = { games: [
    {
      name: "Some Game",
      id: "test-id"
    }
  ] };
  return res.end(JSON.stringify(data));
};
