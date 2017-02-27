var ccwidth = $(".chart-container").width();
var ccheight = $(".chart-container").height();
var ccheight = ccheight > 800 ? ccheight : 800;
var xLabelPadding = 10;

var margin = {top: 10, right: 10, bottom: 100, left: 80},
margin2 = {top: ccheight - 70, right: 10, bottom: 20, left: 80},
width = ccwidth - margin.left - margin.right,
height = ccheight - margin.top - margin.bottom,
height2 = ccheight - margin2.top - margin2.bottom - xLabelPadding;

// var color = d3.scaleOrdinal(d3.schemeCategory10);

var parseDate = d3.timeParse("%Y%m");

var x = d3.scaleTime().range([0, width]),
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
    context = null;




var activeGroups;

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

function resizeAxes(groups) {
    activeGroups = groups;
    x.domain(d3.extent(groups[0].features[0].values, function(d) { return +d.date; }));
    groups.map(function(group,i){
        var groupHeight = height / groups.length;
        var groupDomain = group.range;
        yFocusScales[group.name] = d3.scaleLinear().range([groupHeight * (i+1) - (5), groupHeight * (i) + (5)]).domain(groupDomain);
        yFocusAxes[group.name] = d3.axisLeft(yFocusScales[group.name]).tickFormat(d3.format('.3f')).ticks(3);
    });

    y2.domain([d3.min(groups, function(g) { return g.range[0] }),
              d3.max(groups, function(g) { return g.range[1] }) ]);
    x2.domain(x.domain());
    // y2.domain(y.domain());
}

 var currentScale;
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
function drawLineChart(groups) {
    // console.log('doing chart');
    resizeAxes(groups);



    function sourceIdentity (d, i) {
        var ret = d3.keys(initialSource[0]).indexOf(d.name); // initialSource is a global from index where the data gets loaded.
        return ret;
    }
    // fix for zero line
    focus.selectAll('.context-line').remove();

    var focusChartGroups = focus.select('.trellis-area').selectAll("g.chart").data(groups, function(g) {return g.name+"_"+g.features.length;})

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


    focusChartGroupsChartArea.append('g').attr('class', 'plot-area')

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

         // TODO needs to be redone for the trellis setup
         var contextLine = d3.line()
                .y(function(d){ return yFocusScales[group.name](0)})
                .x(function(d){ return x(+d.date)})

        // do context line
        focuslineGroups.selectAll('.context-line').remove();

        var zeroLine = focusChartGroupsChartArea.select('g.plot-area').selectAll('g.context-line')
        var zeroLine = focuslineGroups
        zeroLine.enter()
                        .append("g")
                        .attr("class","context-line")
                        .append("path")
                        .style("stroke-dasharray", ("3, 3"))
                        .merge(focuslineGroups.selectAll('.context-line path'))
                        .attr("d", function(d) { return contextLine(d.values); });

        zeroLine.exit().remove();

        if (group.range[0] < 0 && group.range[1] >= 0) {
            // console.log('was in range here ^^');
        } else {
            // console.log(d3.select(this).selectAll('.context-line'));
            d3.select(this).selectAll('.context-line').remove();
        }

    });



    // do gridlines
    focusChartGroupsChartArea.select('.plot-area')
    .selectAll('g.grid').remove()

    focusChartGroupsChartArea.select('.plot-area').append("g") // x gridlines
        .attr("class", "grid")
        .attr("transform", function(group,i){
            return "translate(0," + (height / groups.length + 5) *(i+1) + ")"
        })
        .each(function(group) {
            d3.select(this).call(
                d3.axisBottom(x).ticks(10)
                    .tickSize(-height / groups.length)
                    .tickFormat(""));
        });

    // y gridlines
    focusChartGroupsChartArea.select('.plot-area').append("g")
        .attr("class", "grid")
        .each(function(group) {
            d3.select(this).call(
                d3.axisLeft(yFocusScales[group.name]).ticks(4)
            .tickSize(-width)
            .tickFormat(""));
        });

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




    // focus.select(".y.axis").call(yAxis);

   focus.select(".x.axis").transition().call(xAxis);
    context.select(".y.axis").call(yAxis);
    context.select(".x.axis").transition().call(xAxis2);

    brush();
}

var prevSelection;
function brush() {
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
        } else {
            if (prevSelection) {
                selection = prevSelection;
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