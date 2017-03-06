var ccwidth = $(".chart-container").width();
var ccheight = $(".chart-container").height();
var ccheight = window.innerHeight - parseFloat($("body").css("font-size")) *3;
setTimeout(function(){
    var ccheight = $(".chart-container").height();
    var ccheight = window.innerHeight;
},1000);
// var ccheight = ccheight > 800 ? ccheight : 800;
var xLabelPadding = 10;

var margin = {top: 10, right: 10, bottom: 100, left: 80},
margin2 = {top: ccheight - 70, right: 10, bottom: 20, left: 80},
width = ccwidth - margin.left - margin.right,
height = ccheight - margin.top - margin.bottom,
height2 = ccheight - margin2.top - margin2.bottom - xLabelPadding;

// this is done in index now so both views can use
// var color = d3.scaleOrdinal(d3.schemeCategory10);

var parseDate = d3.timeParse("%Y%m");

// changed from time to linear because my 'dates' are just integers
// var x = d3.scaleTime().range([0, width]),
var x = d3.scaleLinear().range([0, width]),
    x2 = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    y2 = d3.scaleLinear().range([height2, 0]);
var yFocusScales = {};
var yFocusAxes = {};

var xAxis = d3.axisBottom(x).tickFormat(d3.format('.0f')),
    xAxis2 = d3.axisBottom(x2).tickFormat(d3.format('.0f')),
    yAxis = d3.axisLeft(y).tickFormat(d3.format('.3f')).ticks(10);


var xbrush = d3.brushX(x2)
    .on("start", brush)
    .on("brush", brush)
    .on("end", brush); // for checking emptyness
var xbrushContext;

var line2 = d3.line()
    .defined(function(d) { return !isNaN(+d.val); })
    .x(function(d) {return x2(+d.date); })
    .y(function(d) {return y2(+d.val); })
    .curve(d3.curveLinear);

var svg = null,
    focus = null,
    context = null,
    tooltip = null,
    vertical;


var activeGroups;

// this function removes and re initialized the chart.
function initLineChart(groups) {

    d3.select(".chart-container svg").remove();

    svg = d3.select(".chart-container").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
      .append("rect")
        .attr("width", width)
        .attr("height", height);

    focus = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    context = svg.append("g")
      .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
    focus.append('g').attr('class','trellis-area');

    tooltip = d3.select(".chart-container").append("div").attr("class", "tt").append("h5").attr("class", "header");

    d3.select(".chart-container .vertical-context").remove();
    vertical = d3.select(".chart-container")
            .append("div")
            .attr('class', 'vertical-context')
            // .attr("class", "remove")
            .style("position", "absolute")
            .style("z-index", "1")
            .style("width", "1px")
            .style("display", "none")
            .style("top", "15px")
            .style("bottom", "110px")
            .style("left", "0px")
            .style("background", "rgba(255,255,255,.4)");

    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2).append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate("+ (width/2) +","+(height2 - 10)+")")  // centre below axis
            .text("Date");

    context.append('g').attr('class','plot-area');


    xbrushContext = context.append("g")
        .attr("class", "x brush")
        .call(xbrush)
      .selectAll("rect")
        .attr("y", -6)
        .attr("height", height2 + 7);

    if (groups.length == 0) {
        return
    }
    resizeAxes(groups);


    drawLineChart(groups);
}

// this function recalculates axes
function resizeAxes(groups) {
    activeGroups = groups;
    // x domain shouldn't change
    x.domain(d3.extent(groups[0].features[0].values, function(d) { return +d.date; }));
    // for each group add its range to the dictionary of d3 scales and axes
    groups.map(function(group,i){
        var groupPadding = 10
        var groupHeight = height / groups.length;
        var groupDomain = group.range;
        yFocusScales[group.name] = d3.scaleLinear().range([groupHeight * (i+1) - (groupPadding), groupHeight * (i) + (groupPadding)]).domain(groupDomain);
        yFocusAxes[group.name] = d3.axisLeft(yFocusScales[group.name]).tickFormat(d3.format('.3f')).ticks(3);
    });

    y2.domain([d3.min(groups, function(g) { return g.range[0] }),
              d3.max(groups, function(g) { return g.range[1] }) ]);
    x2.domain(x.domain());
    // y2.domain(y.domain());
}

 var currentScale;
 // the custom line function for drawing on the different y-axes
function line(d) {
        // find the correct y axis for this feature
        activeGroups.map(function(g,i) {
            g.features.map(function(f,fi) {
                if (f.name === d.name) {
                    currentScale = yFocusScales[g.name];
                }
            });
        });

        // now do the line with the given axis
        return d3.line()
        .defined(function(d) { return !isNaN(+d.val); })
        .x(function(d) { return x(+d.date); })
        .y(function(d) { return currentScale(+d.val); })
        .curve(d3.curveLinear)(d.values)
};

// draws the line chart view
function drawLineChart(groupedCols) {

    var groups = groupedCols.map(function (g) {
        var newG = Object.assign({},g)
        newG.features = newG.features.filter(function(f){return f.name !== "Date"})
        return newG.features.length > 0 ? newG : null
    }).filter(function(g){return g != null})

    resizeAxes(groups);

    // identity function for features
    function sourceIdentity (d, i) {
        var ret = d3.keys(initialSource[0]).indexOf(d.name); // initialSource is a global from index where the data gets loaded.
        return ret;
    }

    // fix for zero line
    focus.selectAll('.context-line').remove();

    var focusChartGroups = focus.select('.trellis-area').selectAll("g.chart").data(groups, function(g) {
        return g.name+"_"+g.features.length;
    })

    focusChartGroups.exit().remove();
    var focusChartGroupsChartArea = focusChartGroups
        .enter()
            .append('g')
            .attr('class', 'chart')

    focusChartGroupsChartArea.append('g')
            .attr('class', 'y axis')
            .merge(focusChartGroupsChartArea.select('g.y.axis'))
            .attr('group-name', function(group){return group.name;})
            .each(function(group){
                d3.select(this).call(yFocusAxes[group.name])
            });


    focusChartGroupsChartArea.append('g').attr('class', 'plot-area').on("mousemove", function(group) {
        // console.log(group);
        var xPos = d3.mouse(this)[0] + margin.left + 25;
        var yPos = d3.mouse(this)[1] + margin.top + 10;
        var tooptipObj = {
            header: "",
            values:{}
        };
        // empty the tooltip
        $(".tt .tooltip-item-container").remove();
        $(".tt").append("<div class='tooltip-item-container'></div>");

        // find the nearest date from the mouse position
        var closestIndex = Math.floor(x.invert(d3.mouse(this)[0] - 5));
        if (group.features[0].values[closestIndex] != undefined) {
            // get all the values for the position
             for(var i = 0; i < group.features.length; i++) {
                var currentFeature = group.features[i];
                tooptipObj.header = currentFeature.values[closestIndex].date;
                tooptipObj.values[currentFeature.name] = currentFeature.values[closestIndex];
            }
            // fill the tooltip
            $(".tt .header").text(tooptipObj.header);
            Object.keys(tooptipObj.values).map(function(key,i){
                var valueColor = color(key);
                var ttName = key.split("_").join(" ") + ":";
                var ttVal = tooptipObj.values[key].val.toFixed(4);
                $(".tt .tooltip-item-container").append("<div class='tooltip-item clearfix'><span class='tooltip-item-color' style='background-color:"+valueColor+"'></span><span class='tooltip-item-name'>"+ttName+"</span><span class='tooltip-item-value'>"+ttVal+"</span></div>")
            });

            $(".tt").css({
                "left": xPos + "px",
                "top": yPos + "px"
            })
            $(".tt").css({display: 'block'})
        } else {
            $(".tt").css({display: 'none'})
        }

        // move the vertical line
         vertical.style("display", "block")
         mousex = d3.mouse(this);
         mousex = mousex[0] + margin.left + 10;
         vertical.style("left", mousex + "px" )

    }).on("mouseover", function(group){
        $(".tt").css({display: 'block'})
        vertical.style("display", "block")
        mousex = d3.mouse(this);
        mousex = mousex[0] + margin.left + 10;
        vertical.style("left", mousex + "px")
    }).on("mouseout", function(group){
        $(".tt").css({display: 'none'})
         vertical.style("display", "none")
    })


    var focuslineGroups = focusChartGroupsChartArea.select('g.plot-area').selectAll("g.lines")
        .data(function(group){return group.features});
    var fgEnter = focuslineGroups
        .enter();
    fgEnter.append("g")
            .attr('class', 'lines')
            .append("path")
            .attr("class","line")
        .merge(focuslineGroups.selectAll('g.lines path.line'))
            .attr("d", function(d) { return line(d); })
            .style("stroke", function(d) {return color(d.name);})
            .attr("clip-path", "url(#clip)");

    focuslineGroups.exit().remove();
    focuslineGroups.selectAll('.context-line').remove();


    focusChartGroupsChartArea.select('g.plot-area').each(function(group){
        d3.select(this).selectAll('.context-line').remove();
        // function for drawing a horizontal line on the right y-axis
         var contextLine = d3.line()
                .y(function(d){ return yFocusScales[group.name](0)})
                .x(function(d){ return x(+d.date)})
        var zeroLine = focuslineGroups;
        if (group.range[0] < 0 && group.range[1] >= 0) {
            zeroLine.enter()
                        .append("g")
                        .attr("class","context-line")
                        .append("path")
                        .style("stroke-dasharray", ("3, 3"))
                        .merge(focuslineGroups.selectAll('.context-line path'))
                        .attr("d", function(d) { return contextLine(d.values); });
            zeroLine.exit().remove();
        } else {
            d3.select(this).selectAll('.context-line').remove();
        }
    });

    // do gridlines
    focusChartGroupsChartArea.select('.plot-area')
    .selectAll('g.grid').remove()

    focusChartGroupsChartArea.select('.plot-area').append("g") // x gridlines
        .attr("class", "grid x")
        .attr("transform", function(group,i){
            var startPos = (height / groups.length + 5) *(i+1)
            return "translate(0," + startPos + ")"
        })
        .each(function(group, i) {
            d3.select(this).call(
                d3.axisBottom(x).ticks(10)
                    .tickSize(-height / groups.length + 5)
                    .tickFormat("")
            );

            // fudge factor for the divider
            var heightOffset = 10 + (i-1)*4;

            if (i > 0) {
                // insert the white divider bar between groups
                d3.select(this).insert("rect",":first-child")
                .style("fill","rgb(140,140,140)")
                    .attr("x", -10)
                    .attr("y", -(height / groups.length) - heightOffset)
                    .attr("width", ccwidth+5)
                    .attr("height", 1);
            }

        });

        // y gridlines
        focusChartGroupsChartArea.select('.plot-area').append("g")
            .attr("class", "grid y")
            .each(function(group) {
                d3.select(this).call(
                    d3.axisLeft(yFocusScales[group.name]).ticks(4)
                .tickSize(-width)
                .tickFormat(""));
        });

    // graph all lines to the same context viewfinder
    var contextlineGroups = context.select('.plot-area').selectAll("g")
        .data(groups)
        .enter().selectAll("g")
        .data(function(group){return group.features}, sourceIdentity);

    contextlineGroups
        .enter()
            .append("g")
            .append("path")
            .attr("class", "line")
        .merge(contextlineGroups.selectAll('path.line'))
            .attr("d", function(d) { return line2(d.values); })
            .style("stroke", function(d) {return color(d.name);})
            .attr("clip-path", "url(#clip)");

    contextlineGroups.exit().remove();

    focus.select(".x.axis").transition().call(xAxis);
    context.select(".y.axis").call(yAxis);
    context.select(".x.axis").transition().call(xAxis2);

    brush();
}

// function for viewfinder brushing has cases for handling empty brush and for re initing brush on new groups
var prevSelection;
function brush() {
    // timeout limiter to reduce lag from mass input
    var redrawLimiter = null;
    context.select('g.x.brush')
        .selectAll('rect')
            .attr("y", -6)
            .attr("height", height2 + 7);

    if (!redrawLimiter) {
        var selection;
        if (d3.event && d3.event.type != 'change') {
            if (d3.event.selection != null) {
                 selection = d3.event.selection;
                prevSelection = selection;
                x.domain(selection ? selection.map(x2.invert, x2) : x2.domain());
            } else {
                x.domain(x2.domain());
            }
        } else { // change event is my custom event from the legend.
            if (prevSelection) {
                console.log("brush here")
                selection = prevSelection; // thus take the previous brush
                x.domain(selection ? selection.map(x2.invert, x2) : x2.domain());
            } else {
                x.domain(x2.domain());
            }
        }
        focus.selectAll("path.line").attr("d",  function(d) {return line(d)});
        focus.select(".x.axis").transition().call(xAxis);
        // focus.select(".y.axis").call(yAxis);
        redrawLimiter = setTimeout(function(){
            redrawLimiter = null;
        },50);
    }
}