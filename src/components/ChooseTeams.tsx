import React, { FunctionComponent, ReactNode } from "react"
import { Game, User, Team } from "../lib/types"
import "./choose-teams.scss"
import {
    ChevronsLeft,
    ChevronsRight,
    ChevronLeft,
    ChevronRight
} from "react-feather"

interface ChooseTeamsProps {
    game: Game
    players: Map<string, User>
    onChooseTeam: (playerId: string, team: Team) => void
    onSetHinter: (playerId: string, team: Team) => void
    onComplete: () => void
}

export const ChooseTeams: FunctionComponent<ChooseTeamsProps> = ({
    game,
    players,
    onChooseTeam,
    onSetHinter,
    onComplete
}) => {
    const blueIds = new Set(game.blueIds)
    const redIds = new Set(game.redIds)
    const playerIf = (team: Team, id: string, icon?: ReactNode) => {
        const player = players.get(id)
        const isHinter =
            player && (game.blueHinter === id || game.redHinter === id)
        const playerContent = (
            <span onClick={() => onSetHinter(id, team)}>
                {player?.name}
                {isHinter ? " (*)" : ""}
            </span>
        )
        if (team === Team.BLUE && blueIds.has(id)) {
            return playerContent
        } else if (team === Team.RED && redIds.has(id)) {
            return playerContent
        } else if (team === Team.NONE && !blueIds.has(id) && !redIds.has(id)) {
            return playerContent
        }
        const defaultIcon = blueIds.has(id) ? <ChevronLeft /> : <ChevronRight />
        return (
            <a onClick={() => onChooseTeam(id, team)}>
                {icon ? icon : defaultIcon}
            </a>
        )
    }
    return (
        <div id="choose-teams">
            <nav>
                <h2>Choose teams for {game.name}</h2>
                <button
                    disabled={game.playerIds.length < 4}
                    onClick={onComplete}
                >
                    Play
                </button>
            </nav>
            <table>
                <thead>
                    <tr>
                        <th className="red">Red</th>
                        <th className="neutral">None</th>
                        <th className="blue">Blue</th>
                    </tr>
                </thead>
                <tbody>
                    {game.playerIds.map(id => (
                        <tr key={id}>
                            <td className="red">
                                {playerIf(Team.RED, id, <ChevronsLeft />)}
                            </td>
                            <td className="neutral">
                                {playerIf(Team.NONE, id)}
                            </td>
                            <td className="blue">
                                {playerIf(Team.BLUE, id, <ChevronsRight />)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
