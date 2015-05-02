project.importSVG('img/map-bg.svg', function () {

    var bonusStopsGroup = new Group();
    var stopLabelsGroup = new Group();
    var bonusStopIds = ["stop_17", "stop_8"];

    var stopsGroup = project.activeLayer.children[0].children.stops;
    if (stopsGroup && stopsGroup.children) {
        stopsGroup.children.forEach(function (stop) {
            stop.onClick = function (event) {
                this.fillColor = 'red';
                console.log(stop.position.x, stop.position.y);
                console.log(stop.name);
            };

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
});

function onResize(event) {
    //paper.view.setViewSize(1000, 1000);
}