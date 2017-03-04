var ccwidth = $(".chart-container").width();
var ccheight = $(".chart-container").height();
// var ccheight = ccheight > 750 ? ccheight : 800;
var ccheight = window.innerHeight - parseFloat($("body").css("font-size")) *3;

var pcMargin = {top: 75, right: 0, bottom: 75, left: 0},
pcMargin2 = {top: ccheight - 70, right: 10, bottom: 20, left: 80},
pcWidth = ccwidth - pcMargin.left - pcMargin.right,
pcHeight = ccheight - pcMargin.top - pcMargin.bottom,
pcHeight2 = ccheight - pcMargin2.top - pcMargin2.bottom;

var pcDragging = null,
    pcDimensions = null,
    pcExtents = null,
    pcBackground = null,
    pcForeground = null,
    pcY = null,
    pcX = null,
    pcKeys = null,
    pcLine = d3.line();

var pcSvg;

function initPcoords(data) {

    drawPcoords(data);
}

function drawPcoords(groups) {

    activeGroups = groups;
    pcY = {};
    pcDragging = {};

    var features = groups.reduce(function(acc, group,i){

        var groupHeight = height / groups.length;
        var groupDomain = group.range;

        return group.features.reduce(function(innerAcc, f, fi){
            pcY[f.name] = d3.scaleLinear()
                .domain(group.range)
                .range([pcHeight, 0]);

            innerAcc.push({
                    group: {name: group.name, range: group.range},
                    name: f.name,
                    values: f.values
                })
                return innerAcc
            },acc);
    }, []);



    console.log(features);
    console.log(groups);

    pcX = d3.scaleBand().rangeRound([0, pcWidth]).padding(1);
    pcX.domain(pcDimensions = features.map(function (d,i) {
            return d.name;
        })
    );




    var dataZipped = features[0].values.map(function(f,i){
        // var data = [v.date]
        return _.zipObject(features.map(function(f){return f.name}), features.map(function(f){return f.values[i]}));
    console.log(dataZipped);
    })

    console.log(dataZipped);

    d3.select('.pc-container').select('svg').remove();

    var pcSvg = d3.select('.pc-container')
        .append("svg")
        .attr("width", pcWidth + pcMargin.left + pcMargin.right)
        .attr("height", pcHeight + pcMargin.top + pcMargin.bottom)
        .append("g")
        .attr("transform", "translate(" + pcMargin.left + "," + pcMargin.top + ")");


    pcExtents = pcDimensions.map(function (p) {
        return [0, 0];
    });
    //
    // Add grey background lines for context when filtering.
    pcBackground = pcSvg.append("g")
        .attr("class", "background")
        .selectAll("path")
        .data(dataZipped)
        .enter().append("path")
        .attr("d", path);

    // Add blue foreground lines for focus.
    pcForeground = pcSvg.append("g")
        .attr("class", "foreground")
        .selectAll("path")
        .data(dataZipped)
        .enter().append("path")
        .attr("d", path);

    // Add a group element for each dimension.
    var pcAxisGroups = pcSvg.selectAll(".dimension")
        .data(features)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", function (d) {
            return "translate(" + pcX(d.name) + ")";
        });

    pcAxisGroups.call(d3.drag()
        .subject(function (d) {
            return {x: pcX(d.name)};
        })
        .on("start", function (d) {
            pcDragging[d.name] = pcX(d.name);
            pcBackground.attr("visibility", "hidden");
        })
        .on("drag", function (d) {
            pcDragging[d.name] = Math.min(pcWidth, Math.max(0, d3.event.x));
            pcForeground.attr("d", path);
            pcDimensions.sort(function (a, b) {
                return position(a) - position(b);
            });
            pcX.domain(pcDimensions);

            pcAxisGroups.attr("transform", function (d) {
                return "translate(" + position(d.name) + ")";
            })
        })
        .on("end", function (d) {
            delete pcDragging[d.name];
            transition(d3.select(this)).attr("transform", "translate(" + pcX(d.name) + ")");
            transition(pcForeground).attr("d", path);
            pcBackground
                .attr("d", path)
                .transition()
                .delay(500)
                .duration(0)
                .attr("visibility", null);
        })
    );

    // Add an axis and title.
    pcAxisGroups.append("g")
        .attr("class", "axis")
        .each(function (d) {
            d3.select(this).call(d3.axisLeft(pcY[d.name]));
        })
        .append("text")
        .style("text-anchor", "start")
        .style("transform", "rotate(-12deg)")

        .attr("y", -9)
        .attr("class", "header")
        .text(function (d, i) {
            return d.name;
        });

    // Add and store a brush for each axis.
    pcAxisGroups.append("g")
        .attr("class", "brush")
        .each(function (d) {
            d3.select(this).call(pcY[d.name].brush = d3.brushY().extent([[-8, 0], [8, pcHeight]])
                .on("start", brushstart)
                .on("brush", brush_parallel_chart)
                .on("end", brush_parallel_chart));
        })
        .selectAll("rect")
        .attr("x", -8)
        .attr("width", 16);





    function position(d) {
        // console.log(pcDragging);
        var v = pcDragging[d];
        return v == null ? pcX(d) : v;
    }

    function transition(g) {
        return g.transition().duration(500);
    }

    // Returns the path for a given data point.
    function path(d) {
        var linePath = pcDimensions.map(function(k,i) {
            var dat = d[k];
            // console.log(k);
            // console.log(position(k));
            // console.log(pcY[k](dat.val));
            // console.log(dat);
            var axisCoords = [position(k), pcY[k](dat.val)];
            return axisCoords;
        })
        var lineRet = pcLine(linePath);
        return lineRet;
    }

    function brushstart() {
        d3.event.sourceEvent.stopPropagation();
    }

    // Handles a brush event, toggling the display of foreground lines.
    function brush_parallel_chart() {
        for (var i = 0; i < pcDimensions.length; ++i) {
            if (d3.event.target == pcY[pcDimensions[i]].brush) {
                if (d3.event.selection == null) {
                    pcExtents[i] = [0,0];
                } else {
                    pcExtents[i] = d3.event.selection.map(pcY[pcDimensions[i]].invert, pcY[pcDimensions[i]]);
                }
            }
        }
        pcForeground.style("display", function (d) {
            return pcDimensions.every(function (p, i) {
                var val = d[p].val;
                if (pcExtents[i][0] == 0 && pcExtents[i][1] == 0) {
                    return true;
                }
                return pcExtents[i][1] <= val && val <= pcExtents[i][0];
            }) ? null : "none";
        });
    }



}

// init() {

//         var dataset = this.dataset;
//         this.keys = dataset.shift();
//         this.rotatedDataset = this.keys.map(function (col, i) {
//             return dataset.map(function (row) {
//                 return row[i];
//             });
//         });
//         this.cleanedDataset = dataset;

//         this.draw();


//         if (this.options.resize) {
//             setTimeout(function() {
//                 window.dispatchEvent(new Event('resize'));
//             }, 10);
//         }
//     }
