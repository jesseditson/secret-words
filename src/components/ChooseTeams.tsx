import React, { FunctionComponent, useState } from "react"
import { Game, User, Team } from "../lib/types"

interface ChooseTeamsProps {
    game: Game
    players: Map<string, User>
    onChooseTeam: (playerId: string, team: Team) => void
    onSetHinter: (playerId: string, team: Team) => void
    onComplete: () => void
}

export const needsTeamAssignment = (game: Game): boolean => {
    const redPlayers = game.redIds.length
    const bluePlayers = game.blueIds.length
    const totalPlayers = game.playerIds.length
    return totalPlayers < 4 || redPlayers + bluePlayers < totalPlayers
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
    const playerIf = (team: Team, id: string) => {
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
        return <button onClick={() => onChooseTeam(id, team)}>Choose</button>
    }
    return (
        <div id="chooseTeams">
            <h2>Choose teams for {game.name}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Red</th>
                        <th>None</th>
                        <th>Blue</th>
                    </tr>
                </thead>
                <tbody>
                    {game.playerIds.map(id => (
                        <tr key={id}>
                            <td>{playerIf(Team.RED, id)}</td>
                            <td>{playerIf(Team.NONE, id)}</td>
                            <td>{playerIf(Team.BLUE, id)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <button disabled={needsTeamAssignment(game)} onClick={onComplete}>
                Play
            </button>
        </div>
    )
}
