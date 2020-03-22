import React, { FunctionComponent, useState } from "react"
import { Link } from "./Link"
import { Game, GameState } from "../lib/types"

interface GamesProps {
    games: Game[]
    userId: string
    onCreateGame: (name: string) => void
    onDeleteGame: (game: Game) => void
    onJoinGame: (game: Game) => void
    onViewGame: (game: Game) => void
}

export const Games: FunctionComponent<GamesProps> = ({
    games,
    userId,
    onCreateGame,
    onDeleteGame,
    onJoinGame,
    onViewGame
}) => {
    const [showingNewDialog, setShowingNewDialog] = useState(false)
    const [newGameName, setNewGameName] = useState<string>("")
    const newGames = []
    const activeGames = []
    const finishedGames = []
    for (const game of games) {
        if (game.state === GameState.NEW) {
            newGames.push(game)
        } else if (game.state === GameState.STARTED) {
            activeGames.push(game)
        } else if (game.state === GameState.FINISHED) {
            finishedGames.push(game)
        }
    }
    const renderGame = (game: Game) => {
        const canJoin =
            game.state === GameState.NEW &&
            !game.playerIds.some(id => id === userId)
        return (
            <li className="game" key={game._id}>
                <div className="info">
                    <h4>{game.name}</h4>
                    <span>
                        {game.state === GameState.NEW
                            ? "Waiting for players"
                            : game.state === GameState.STARTED
                            ? "In progress"
                            : "Finished"}
                    </span>
                    <span> - </span>
                    <span>
                        {game.playerIds.length} player
                        {game.playerIds.length === 1 ? "" : "s"}
                    </span>
                </div>
                <div className="actions">
                    <Link
                        href={`/game/${game._id}`}
                        onClick={() =>
                            canJoin ? onJoinGame(game) : onViewGame(game)
                        }
                    >
                        {canJoin ? "Join" : "Show"}
                    </Link>
                    {game.creatorId === userId ? (
                        <Link href="#" onClick={() => onDeleteGame(game)}>
                            Delete
                        </Link>
                    ) : null}
                </div>
            </li>
        )
    }
    return (
        <div id="games">
            <button onClick={() => setShowingNewDialog(true)}>New Game</button>
            {showingNewDialog ? (
                <div className="dialog">
                    <form
                        onSubmit={e => {
                            e.preventDefault()
                            onCreateGame(newGameName!)
                            setShowingNewDialog(false)
                        }}
                    >
                        <fieldset>
                            <legend>Name</legend>
                            <input
                                id="game-name"
                                placeholder="Good Vibes"
                                value={newGameName}
                                onChange={e => setNewGameName(e.target.value)}
                            />
                        </fieldset>
                        <button disabled={!newGameName}>Create</button>
                    </form>
                </div>
            ) : null}
            <h3>New Games</h3>
            <ul>{newGames.map(renderGame)}</ul>
            <h3>Active Games</h3>
            <ul>{activeGames.map(renderGame)}</ul>
            <h3>Finished Games</h3>
            <ul>{finishedGames.map(renderGame)}</ul>
        </div>
    )
}
