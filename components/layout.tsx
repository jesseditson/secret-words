import { SFC } from "react";

interface LayoutProps {
  error?: Error
}

// https://coolors.co/b39878-deffe5-ffe5c5-ccabff-9481b3

const Layout: SFC<LayoutProps> = props => {
  const { children, error } = props;
  return (
    <main>
      <h1>Secret Words</h1>
      {error && <div className="error">Error: {error.message}</div>}
      {children}
      <style jsx>{`
        .error {
          color: red;
        }
      `}</style>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css?family=Oswald&display=swap");
        html,
        body {
          height: 100%;
          box-sizing: border-box;
        }
        body {
          font-family: "Oswald", sans-serif;
          font-size: 14px;
          display: flex;
          background-color: #FFE5C5;
          color: #9481B3;
          padding: 10px 20px;
        }
        a {
          text-decoration: none;
          color: inherit;
        }
        a:hover {
          color: #CCABFF;
        }
        *:focus {
          outline: none;
        }
      `}</style>
    </main>
  );
};

export default Layout;
