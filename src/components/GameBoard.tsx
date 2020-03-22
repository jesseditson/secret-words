import React, { FunctionComponent, useState } from "react"
import classNames from "classnames"
import { Game, User, Tile, Team, GameState } from "../lib/types"
import getLogger from "debug"
const debug = getLogger("secret-words:game-board")

interface GameBoardProps {
    game: Game
    tiles: Tile[]
    user: User
    userTeam: Team
    onGuess: (tile: Tile) => void
    onSetGuessCount: (count: number) => void
    onFinishGuessing: () => void
}

interface TilesProps {
    tiles: Tile[]
    showTeams: boolean
    onClickTile: (tile: Tile) => void
}

const Tiles: FunctionComponent<TilesProps> = ({
    tiles,
    showTeams,
    onClickTile
}) => {
    const rows: Tile[][] = tiles.reduce(
        (rows: Tile[][], tile, idx) => {
            let row = rows[rows.length - 1]
            row.push(tile)
            if (row.length % 5 === 0 && idx < tiles.length - 1) {
                rows.push([])
            }
            return rows
        },
        [[]]
    )
    return (
        <table id="tiles">
            <tbody>
                {rows.map((row, idx) => (
                    <tr key={`row:${idx}`}>
                        {row.map(tile => {
                            const showColor =
                                showTeams || tile.guessedBy !== undefined
                            return (
                                <td
                                    key={tile._id}
                                    onClick={() => onClickTile(tile)}
                                    className={classNames("tile", {
                                        red:
                                            showColor && tile.team === Team.RED,
                                        neutral:
                                            showColor &&
                                            tile.team === Team.NONE,
                                        blue:
                                            showColor &&
                                            tile.team === Team.BLUE,
                                        death:
                                            showColor &&
                                            tile.team === Team.DEATH
                                    })}
                                >
                                    {tile.word}
                                </td>
                            )
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export const GameBoard: FunctionComponent<GameBoardProps> = ({
    game,
    tiles,
    user,
    userTeam,
    onGuess,
    onSetGuessCount,
    onFinishGuessing
}) => {
    const [guessCount, setGuessCount] = useState(1)
    const isHinter =
        (userTeam === Team.RED && game.redHinter === user._id) ||
        (userTeam === Team.BLUE && game.blueHinter === user._id)
    const isPlayer = userTeam !== Team.NONE
    const isTeamTurn = isPlayer && game.turn === userTeam
    const isHinterTurn = isTeamTurn && isHinter && !game.isGuessing
    const isGuesserTurn = isTeamTurn && !isHinterTurn
    const isOpponentTurn = isPlayer && !isTeamTurn
    const guessDesc =
        game.guessesRemaining === 1
            ? "1 guess"
            : `${game.guessesRemaining} guesses`
    debug("is player", isPlayer)
    debug("is team turn", isTeamTurn)
    debug("is hinter turn", isHinterTurn)
    debug("is guesser turn", isGuesserTurn)
    debug("is opponent turn", isOpponentTurn)
    return (
        <div id="game">
            <h2>{game.name}</h2>
            {isHinterTurn ? (
                <div className="hinter-info">
                    <p>
                        {
                            "Give your team a one-word clue and a number of tiles to guess."
                        }
                    </p>
                    <form
                        onSubmit={e => {
                            e.preventDefault()
                            onSetGuessCount(guessCount)
                        }}
                    >
                        <fieldset>
                            <legend>Guesses</legend>
                            <input
                                type="number"
                                min="1"
                                max="7"
                                step="1"
                                value={guessCount}
                                onChange={e =>
                                    setGuessCount(parseInt(e.target.value, 10))
                                }
                            ></input>
                            <button>Done</button>
                        </fieldset>
                    </form>
                </div>
            ) : null}
            {isGuesserTurn ? (
                <div className="hinter-info">
                    <p>
                        {`Click a word to guess. You have ${guessDesc} left.`}
                    </p>
                    <button onClick={() => onFinishGuessing()}>
                        Finish Turn
                    </button>
                </div>
            ) : null}
            {game.state !== GameState.FINISHED &&
            (isOpponentTurn || !isPlayer) ? (
                <div className="player-info">
                    <p>
                        {isOpponentTurn
                            ? "Opponent's turn."
                            : `${userTeam} team's turn.`}
                    </p>
                    <p>
                        {game.isGuessing
                            ? `They have ${guessDesc} left.`
                            : "Their hinter is choosing a word."}
                    </p>
                </div>
            ) : null}
            {game.state === GameState.FINISHED ? (
                <div className="finished-info">
                    <p>Game Complete!</p>
                </div>
            ) : null}
            <div className="board">
                <Tiles
                    tiles={tiles}
                    showTeams={isHinter}
                    onClickTile={tile => onGuess(tile)}
                />
            </div>
        </div>
    )
}
