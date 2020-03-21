import Layout from "../components/layout";
import { NextPage } from "next";
import useSWR from "swr";
import fetcher, { isomorphicFetcher } from "../lib/api";
import { GameWorker } from "./api/games";

interface HomeProps {
  games: GameWorker[];
}

const Home: NextPage<HomeProps> = props => {
  const initialData = {games: props.games};
  const { data, error } = useSWR<{games: GameWorker[]}>("/api/games", fetcher, { initialData });
  const {games} = data || {}
  return (
    <Layout error={error}>
      <ul>
        {games && games.map(game => 
          <li key={game.id} className="game">
            <a href={`/game/${game.id}`}>{game.name}</a>
          </li>
        )}
      </ul>
      <style jsx>{`
        
      `}</style>
    </Layout>
  );
};

Home.getInitialProps = async ctx => {
  const {games} = await isomorphicFetcher(ctx.req?.headers)("/api/games");
  return { games };
};

export default Home;
