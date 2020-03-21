import Layout from "../components/layout";
import { NextPage } from "next";
import useSWR from "swr";
import fetcher, { isomorphicFetcher } from "../lib/api";

interface HomeProps {
  data: { hello: string };
}

const Home: NextPage<HomeProps> = props => {
  const initialData = props.data;
  const { data, error } = useSWR("/api/data", fetcher, { initialData });
  return (
    <Layout>
      <h1>Secret Words</h1>
      <span>{data && data.hello}</span>
      <style jsx>{``}</style>
    </Layout>
  );
};

Home.getInitialProps = async ctx => {
  const data = await isomorphicFetcher(ctx.req?.headers)("/api/data");
  return { data };
};

export default Home;
