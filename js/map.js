var teams = [],
    moves = new Map(),
    game = null,
    catches = [],
    playbackRatio = 200,
    gameId = 1,
    stops = {},
    teamGroups = new Map(),
    catchItems = [];

var defaultStyle = {
    strokeWidth: 3
};

var teamColors = ['#A1FFC8', '#A1D8FF', '#A3A3A3', '#FFA1D8', '#FFC6A1'];
var chameleonColors = ['#4E395D', '#827085', '#8EBE94', '#CCFC8E', '#DC5B3E'];
var playersColor = '#FFC6A1';
var chameleonsColor = '#CCFC8E';
var catchColor = '#31FFE4';
var bonusStopIds = ["stop_17", "stop_8"];

var playerIds = [1, 2, 3, 4, 5];
var chameleonIds = [21, 22, 23, 24, 25, 26];
var displayBinaryColors = true;
var displayedTeamIds = playerIds + chameleonIds;

var movesComparator = function (m1, m2) {
    var moveDates = [new Date(m1.move_date), new Date(m2.move_date)];
    return moveDates[0] - moveDates[1];
};

function getTeamColor(teamId) {
    if (teamId <= 5) {
        return displayBinaryColors ? playersColor : teamColors[teamId - 1];
    } else {
        return displayBinaryColors ? chameleonsColor : chameleonColors[teamId - 21];
    }
}
function getTeamRadius(teamId) {
    if (teamId <= 5) {
        return 25 - (teamId * 2);
    } else {
        return 27;
    }
}

function createStopCircle(stopId, teamId, opacity) {
    var stop = stops['stop_' + stopId];
    var path = new Path.Circle(new Point(stop.position.x, stop.position.y), getTeamRadius(teamId));
    path.style = defaultStyle;
    path.strokeColor = getTeamColor(teamId);

    if (opacity != null) {
        path.opacity = opacity;
    }

    return path;
}

function createCatchStop(stopId) {
    var stop = stops['stop_' + stopId];
    var path = new Path.Circle(new Point(stop.position.x, stop.position.y), 35);
    path.style = defaultStyle;
    path.strokeColor = catchColor;
    return path;
}

function createStopsConnection(stopFromId, stopToId, teamId, stopViaId) {
    var stopFrom = stops['stop_' + stopFromId];
    var stopTo = stops['stop_' + stopToId];
    var stopVia = stopViaId != null ? stops['stop_' + stopViaId] : null;
    var path = new Path();

    path.add(new Point(stopFrom.position.x, stopFrom.position.y));
    if (stopVia != null) {
        path.add(new Point(stopVia.position.x, stopVia.position.y));
    }
    path.add(new Point(stopTo.position.x, stopTo.position.y));
    path.style = defaultStyle;
    path.strokeColor = getTeamColor(teamId);

    return path;
}

paper.install(window);
window.onload = function () {
    paper.setup('map-canvas');

    $.when(
        $.getJSON("/chameleon/back/api.php?endpoint=team"),
        $.getJSON("/chameleon/back/api.php?endpoint=move"),
        $.getJSON("/chameleon/back/api.php?endpoint=game&id=" + gameId),
        $.getJSON("/chameleon/back/api.php?endpoint=catch"))
        .done(function (teamsResult, movesResult, gameResult, catchesResult) {

            game = gameResult[0];
            teams = teamsResult[0];
            catches = catchesResult[0];
            var gameStart = new Date(game.start_date);

            movesResult[0].forEach(function (move) {

                move.seconds_from_start = ((new Date(move.move_date)).getTime() - gameStart.getTime()) / 1000;
                if (!moves.has(move.team_id)) {
                    moves.set(move.team_id, []);
                }
                moves.get(move.team_id).push(move);
            });

            // .. sort team moves by timestamp
            moves.forEach(function (teamMoves, teamId, map) {
                map.set(teamId, teamMoves.sort(movesComparator));
            });

            catches.forEach(function (chCatch) {
                chCatch.seconds_from_start = ((new Date(chCatch.catch_date)).getTime() - gameStart.getTime()) / 1000;
            });

            view.play();
        });

    project.importSVG('img/map-bg.svg', function () {

        var bonusStopsGroup = new Group();
        var stopLabelsGroup = new Group();
        var mapLayer = project.layers[0];
        var shieldLayer = new Layer();
        var movesLayer = new Layer();
        var stopsGroup = mapLayer.children[0].children.stops;

        mapLayer.activate();

        if (stopsGroup && stopsGroup.children) {
            stopsGroup.children.forEach(function (stop) {

                stops[stop.name] = stop;
                var center = new Point(stop.position.x, stop.position.y);

                if (bonusStopIds.indexOf(stop.name) != -1) {
                    var shape = new Path.RegularPolygon(center, 5, 20);
                    shape.strokeColor = 'black';
                    shape.fillColor = '#DDDDDD';
                    bonusStopsGroup.addChild(shape);
                }

                var text = new PointText(new Point(stop.position.x, stop.position.y + 5));
                text.justification = 'center';
                text.fillColor = 'black';
                text.fontSize = '15px';
                text.content = stop.name.substr(5);
                stopLabelsGroup.addChild(text);
            });
        }

        bonusStopsGroup.moveBelow(stopsGroup);

        shieldLayer.activate();
        var shield = new Path.Rectangle(view.bounds);
        shield.fillColor = 'black';
        shieldLayer.opacity = 0.3;
        movesLayer.opacity = 0.5;
        movesLayer.activate();
    });

    view.onFrame = function (event) {
        var gameTimeDelta = event.delta * playbackRatio,
            gameTime = (event.time * playbackRatio),
            lastGameTime = gameTime - gameTimeDelta;

        if (gameTime > 140 * 60) {
            view.stop();
            console.log("stopped");
        }

        console.log(gameTime);

        teams.forEach(function (team) {

            if (displayedTeamIds.indexOf(team.id) == -1) {
                return;
            }

            var teamMoves = moves.get(team.id);
            if (!teamMoves) return;

            if (!teamGroups.has(team.id)) {
                teamGroups.set(team.id, new Group());
            }

            var group = teamGroups.get(team.id);

            teamMoves.forEach(function (move) {
                if (move.seconds_from_start > lastGameTime && move.seconds_from_start <= gameTime) {
                    if (move.type.toLowerCase() == 'single') {
                        group.removeChildren();
                        group.addChild(createStopCircle(move.stop_from, team.id, 0.3));
                        group.addChild(createStopsConnection(move.stop_from, move.stop_to, team.id));
                        group.addChild(createStopCircle(move.stop_to, team.id));
                    } else if (move.type.toLowerCase() == 'double') {
                        group.removeChildren();
                        group.addChild(createStopCircle(move.stop_from, team.id, 0.3));
                        group.addChild(createStopsConnection(move.stop_from, move.stop_to, team.id, move.stop_via));
                        group.addChild(createStopCircle(move.stop_to, team.id));
                    } else if (move.type.toLowerCase() == 'stop') {
                        group.removeChildren();
                        group.addChild(createStopCircle(move.stop_to, team.id));
                    }
                }
            });
        });

        catches.forEach(function (chCatch) {
            if (chCatch.seconds_from_start > lastGameTime && chCatch.seconds_from_start <= gameTime) {
                var path = createCatchStop(chCatch.stop_id);
                catchItems.push(path);
            }
        });

        catchItems.forEach(function (item) {
           //item.strokeColor.opacity += 0.1;
        });


    };

};