import { SFC } from "react";

const Layout: SFC = props => {
  const { children } = props;
  return (
    <main>
      {children}
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
          align-items: center;
          justify-content: center;
          background-color: black;
          color: rgba(255, 255, 255, 0.6);
        }
        a {
          text-decoration: none;
          color: inherit;
        }
        a:hover {
          color: rgba(255, 255, 255, 0.5);
        }
        *:focus {
          outline: none;
        }
      `}</style>
    </main>
  );
};

export default Layout;
