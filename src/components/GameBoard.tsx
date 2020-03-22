import React, { FunctionComponent, useState } from "react"
import classNames from "classnames"
import { Game, User, Tile, Team, GameState } from "../lib/types"
import getLogger from "debug"
import { countTilesLeft, getWinner } from "../lib/util"
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
    isGuessing: boolean
    onClickTile: (tile: Tile) => void
}

const Tiles: FunctionComponent<TilesProps> = ({
    tiles,
    showTeams,
    isGuessing,
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
                            const isGuessed = tile.guessedBy !== undefined
                            const showColor = showTeams || isGuessed
                            return (
                                <td
                                    key={tile._id}
                                    onClick={() =>
                                        isGuessing ? onClickTile(tile) : null
                                    }
                                    className={classNames("tile", {
                                        clickable: isGuessing,
                                        guessed: isGuessed,
                                        showing: showTeams,
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
    const isFinished = game.state === GameState.FINISHED
    const isPlayer = userTeam !== Team.NONE
    let isHinter = false
    if (userTeam === Team.RED && game.redHinter === user._id) {
        console.log("is red hinter", userTeam, game, user)
        isHinter = true
    } else if (userTeam === Team.BLUE && game.blueHinter === user._id) {
        console.log("is blue hinter", userTeam, game, user)
        isHinter = true
    }
    const isGuesser = isPlayer && !isHinter
    const isTeamTurn = isPlayer && game.turn === userTeam
    const isHinting = !isFinished && isTeamTurn && !game.isGuessing
    const isGuessing = !isFinished && isTeamTurn && game.isGuessing
    const guessDesc =
        game.guessesRemaining === 1
            ? "1 guess"
            : `${game.guessesRemaining} guesses`
    const redTilesRemaining = countTilesLeft(tiles, Team.RED)
    const blueTilesRemaining = countTilesLeft(tiles, Team.BLUE)
    const teamTilesRemaining =
        userTeam === Team.RED ? redTilesRemaining : blueTilesRemaining
    const desc = (color: string, count: number, prefix: boolean = false) =>
        count === 1
            ? `${prefix ? "is " : ""}1 ${color} tile`
            : `${prefix ? "are " : ""}${count} ${color} tiles`

    return (
        <div id="game">
            <h2>{game.name}</h2>
            {isPlayer ? (
                <div className="game-info">
                    <p>
                        You are {isHinter ? "the Hinter" : "a Guesser"} on team{" "}
                        {userTeam}
                    </p>
                    <p>
                        There {desc("blue", blueTilesRemaining, true)} and{" "}
                        {desc("red", redTilesRemaining)} left.
                    </p>
                </div>
            ) : null}
            {isHinter && isHinting ? (
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
                                max={`${teamTilesRemaining}`}
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
            {isHinter && isGuessing ? (
                <div className="hinter-info">
                    <p>
                        {`Your team is guessing. They have ${guessDesc} left.`}
                    </p>
                </div>
            ) : null}
            {isGuesser && isHinting ? (
                <div className="guesser-info">
                    <p>{`Your hinter is coming up with a word.`}</p>
                </div>
            ) : null}
            {isGuesser && isGuessing ? (
                <div className="guesser-info">
                    <p>
                        {`Click a word to guess. You have ${guessDesc} left.`}
                    </p>
                    <button onClick={() => onFinishGuessing()}>
                        Finish Turn
                    </button>
                </div>
            ) : null}
            {!isFinished && (!isTeamTurn || !isPlayer) ? (
                <div className="player-info">
                    <p>
                        {isPlayer
                            ? "Opponent's turn."
                            : `${game.turn} team's turn.`}
                    </p>
                    <p>
                        {game.isGuessing
                            ? `They have ${guessDesc} left.`
                            : "Their hinter is choosing a word."}
                    </p>
                </div>
            ) : null}
            {isFinished ? (
                <div className="finished-info">
                    <p>Game Complete!</p>
                    <p>
                        Winner: Team{" "}
                        {getWinner(
                            tiles,
                            redTilesRemaining,
                            blueTilesRemaining
                        )}
                    </p>
                </div>
            ) : null}
            <div className="board">
                <Tiles
                    tiles={tiles}
                    isGuessing={isGuessing}
                    showTeams={isHinter || isFinished}
                    onClickTile={tile => onGuess(tile)}
                />
            </div>
        </div>
    )
}
