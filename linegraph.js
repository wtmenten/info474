        var ccwidth = $(".chart-container").width();
        var ccheight = $(".chart-container").height();
        var ccheight = ccheight > 600 ? ccheight : 600;
        var margin = {top: 10, right: 10, bottom: 100, left: 80},
        margin2 = {top: ccheight - 70, right: 10, bottom: 20, left: 80},
        width = ccwidth - margin.left - margin.right,
        height = ccheight - margin.top - margin.bottom,
        height2 = ccheight - margin2.top - margin2.bottom;

        var color = d3.scaleOrdinal(d3.schemeCategory10);

        var parseDate = d3.timeParse("%Y%m");

        var x = d3.scaleTime().range([0, width]),
            x2 = d3.scaleTime().range([0, width]),
            y = d3.scaleLinear().range([height, 0]),
            y2 = d3.scaleLinear().range([height2, 0]);

        var xAxis = d3.axisBottom(x).tickFormat(d3.format('.0f')),
            xAxis2 = d3.axisBottom(x2).tickFormat(d3.format('.0f')),
            yAxis = d3.axisLeft(y).tickFormat(d3.format('.2f')).ticks(10);

        var xbrush = d3.brushX(x2)
            .on("start", brush)
            .on("brush", brush)
            .on("end", brush); // for checking emptyness
        var xbrushContext;
        var line = d3.line()
            .defined(function(d) { return !isNaN(+d.val); })
            .x(function(d) { return x(+d.Date); })
            .y(function(d) { return y(+d.val); })
            .curve(d3.curveLinear);

        var line2 = d3.line()
            .defined(function(d) { return !isNaN(+d.val); })
            .x(function(d) {return x2(+d.Date); })
            .y(function(d) {return y2(+d.val); })
            .curve(d3.curveLinear);


        var svg = d3.select(".chart-container").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);

        svg.append("defs").append("clipPath")
            .attr("id", "clip")
          .append("rect")
            .attr("width", width)
            .attr("height", height);

        var focus = svg.append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var context = svg.append("g")
          .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");



        function initLineChart(data) {

            var sources = d3.keys(data[0]).filter(function(key) { return key !== "Date"; }).map(function(name) {
              return {
                name: name,
                values: data.map(function(d) {
                  return {Date: +d.Date, val: +d[name]};
                })
              };
            });

            x.domain(d3.extent(data, function(d) { return +d.Date; }));
            y.domain([d3.min(sources, function(c) { return d3.min(c.values, function(v) { return +v.val; }); }),
                      d3.max(sources, function(c) { return d3.max(c.values, function(v) { return +v.val; }); }) ]);
            x2.domain(x.domain());
            y2.domain(y.domain());

            focus.append('g').attr('class','plot-area');
            focus.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            focus.append("g")
                .attr("class", "y axis")
                .call(yAxis);

            context.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height2 + ")")
                .call(xAxis2);

            context.append('g').attr('class','plot-area');


            xbrushContext = context.append("g")
                .attr("class", "x brush")
                .call(xbrush)
              .selectAll("rect")
                .attr("y", -6)
                .attr("height", height2 + 7);


            drawLineChart(data);
        }

        var oldYDomain = y.domain();
        // draws the line chart view
        function drawLineChart(data, callback) {
            // console.log('doing chart');
            // console.log(data);

            data.forEach(function(d) {
            //          d.Date = parseDate(d.Date);
              d.Date = +d.Date;
            });

            var sources = d3.keys(data[0]).filter(function(key) { return key !== "Date"; }).map(function(name) {
              return {
                name: name,
                values: data.map(function(d) {
                  return {Date: +d.Date, val: +d[name]};
                })
              };
            });

            x.domain(d3.extent(data, function(d) { return +d.Date; }));
            y.domain([d3.min(sources, function(c) { return d3.min(c.values, function(v) { return +v.val; }); }),
                      d3.max(sources, function(c) { return d3.max(c.values, function(v) { return +v.val; }); }) ]);
            x2.domain(x.domain());
            y2.domain(y.domain());

            function sourceIdentity (d, i) {
                var ret = d3.keys(initialSource[0]).indexOf(d.name); // initialSource is a global from index where the data gets loaded.
                return ret;
            }

            var focuslineGroups = focus.select('.plot-area').selectAll("g")
                .data(sources, sourceIdentity);



            focuslineGroups
                .enter()
                    .append("g")
                    .append("path")
                    .attr("class","line")
                .merge(focuslineGroups.selectAll('path.line'))
                    .attr("d", function(d) { return line(d.values); })
                    .style("stroke", function(d) {return color(d.name);})
                    .attr("clip-path", "url(#clip)");

            focuslineGroups.exit().remove();



            var contextlineGroups = context.select('.plot-area').selectAll("g")
                .data(sources,sourceIdentity);

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
            focus.select(".y.axis").call(yAxis);
            context.select(".x.axis").transition().call(xAxis2);

            oldYDomain = y.domain();
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
                console.log(d3.event);
                // console.log(d3.event.selection);

                if (d3.event && d3.event.type != 'change') {
                    if (d3.event.selection != null) {
                         selection = d3.event.selection;
                        prevSelection = selection;
                        x.domain(selection ? selection.map(x2.invert, x2) : x2.domain());
                    } else {
                        console.log('clearing brush');
                        x.domain(x2.domain());
                    }
                } else {
                    if (prevSelection) {
                        selection = prevSelection;
                        x.domain(selection ? selection.map(x2.invert, x2) : x2.domain());
                    } else {
                        console.log('clearing brush');
                        x.domain(x2.domain());
                    }
                }

                focus.selectAll("path.line").attr("d",  function(d) {return line(d.values)});
                focus.select(".x.axis").transition().call(xAxis);
                focus.select(".y.axis").call(yAxis);
                redrawLimiter = setTimeout(function(){
                    redrawLimiter = null;
                },50);
            }
        }