import React, { FunctionComponent, useState } from "react"
import { Game, User, Tile, Team, GameState } from "../lib/types"
import { countTilesLeft, getWinner } from "../lib/util"
import { Tiles } from "./Tiles"
import "./game-board.scss"
import { Link } from "./Link"
import { Minus, Plus } from "react-feather"
import { VideoChat } from "./VideoChat"

interface GameBoardProps {
    game: Game
    tiles: Tile[]
    user: User
    players: User[]
    userTeam: Team
    onGuess: (tile: Tile) => void
    onSetGuessCount: (count: number) => void
    onFinishGuessing: () => void
}

export const GameBoard: FunctionComponent<GameBoardProps> = ({
    game,
    tiles,
    user,
    players,
    userTeam,
    onGuess,
    onSetGuessCount,
    onFinishGuessing
}) => {
    const [guessCount, setGuessCount] = useState(1)
    const redTilesRemaining = countTilesLeft(tiles, Team.RED)
    const blueTilesRemaining = countTilesLeft(tiles, Team.BLUE)
    const isFinished =
        game.state === GameState.FINISHED || getWinner(tiles) !== Team.NONE
    const isPlayer = userTeam !== Team.NONE
    let isHinter = false
    if (userTeam === Team.RED && game.redHinter === user._id) {
        isHinter = true
    } else if (userTeam === Team.BLUE && game.blueHinter === user._id) {
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
    const desc = (color: string, count: number, prefix: boolean = false) =>
        count === 1 ? (
            <span>
                {prefix ? "is " : ""}
                <span className={color}>1 {color} tile</span>
            </span>
        ) : (
            <span>
                {prefix ? "are " : ""}
                <span className={color}>
                    {count} {color} tiles
                </span>
            </span>
        )

    return (
        <div id="game">
            <div className="info-container">
                <h2>{game.name}</h2>
                {isPlayer ? (
                    <div className="game-info">
                        <p>
                            You are {isHinter ? "the Hinter" : "a Guesser"} on
                            team{" "}
                            <span
                                className={
                                    userTeam === Team.RED ? "red" : "blue"
                                }
                            >
                                {userTeam}
                            </span>
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
                                <div className="field-content">
                                    <div className="number-field">
                                        <a
                                            className="button"
                                            onClick={() =>
                                                setGuessCount(guessCount - 1)
                                            }
                                        >
                                            <Minus />
                                        </a>
                                        <span className="number-value">
                                            {guessCount}
                                        </span>
                                        <a
                                            className="button"
                                            onClick={() =>
                                                setGuessCount(guessCount + 1)
                                            }
                                        >
                                            <Plus />
                                        </a>
                                    </div>
                                    <button>Done</button>
                                </div>
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
            </div>
            <div className="board">
                <Tiles
                    tiles={tiles}
                    isGuessing={!isHinter && isGuessing}
                    showTeams={isHinter || isFinished}
                    onClickTile={tile => onGuess(tile)}
                />
            </div>
            {/* <VideoChat user={user} users={players} game={game} /> */}
        </div>
    )
}
