// all functions take array of col objs {name,values}

// returns array of groups {name, features}
var groupFeatures = {
    byAttr: function(data, attrName) {
        var result = _.chain(data)
            .groupBy(attrName)
            .pairs()
            .map(function (currentItem) {
                return _.object(_.zip(["name", "features"], currentItem));
            })
            .value();
        // console.log(result);
        return result;
    },

    // special case for smart-grouping
    byDomain: function(data, options) {
        var groups = [];
        var sortFuncs =  [
            function(val){ return val.range[1] - val.range[0]},
            function(val){ return val.range[0]},
        ];

        for (var i = 0, iLen = data.length; i < iLen; i++) {
            var col = data[i];
            var localMin = _.minBy(col.values, function(d){ return d.val;}).val;
            var localMax = _.maxBy(col.values, function(d){ return d.val;}).val;
            if (groups.length == 0) {
                var newRange = [localMin,localMax]
                var newGroup = {
                    name: newRange.map(function(r){return r < 1 ? r.toFixed(4) : r}).toString(),
                    range: newRange,
                    features: [col]
                }
                groups.push(newGroup);
            } else {
                var unfound = true;
                for (var j = 0, jLen = groups.length; j < jLen; j++) {
                    var group = groups[j];
                    var minTest, maxTest;
                    var tgMin = group.range[0];
                    var tgMax = group.range[1];
                    var tlMin = localMin;
                    var tlMax = localMax;
                    minRatio = Math.abs((tlMin+0.001)/(tgMin+0.001))
                    minTest = minRatio > .5 && minRatio < 1.5;
                    maxRatio = Math.abs((tlMax+0.001)/(tgMax+0.001))
                    maxTest = maxRatio > .5 && maxRatio < 1.5;

                    var rangeTest = Math.abs((tgMax-tgMin) - (tlMax-tlMin)) < 5; // TODO mabe the .2 could become normalized to also help group the volumes
                    var isWithinAcceptableMin = minTest || Math.abs((tgMin - tlMin)) < 2;
                    var isWithinAcceptableMax = maxTest || Math.abs((tgMax - tlMax)) < 2;
                    if ((isWithinAcceptableMin && isWithinAcceptableMax) || (rangeTest && isWithinAcceptableMin) || (rangeTest && isWithinAcceptableMax)) {
                        group.features.push(col);
                        unfound = false;
                        if (localMin < group.range[0]) {
                            group.range[0] = localMin;
                            group.name = group.range.map(function(r){return r < 1 ? r.toFixed(4) : r}).toString();
                        }
                        if (localMax > group.range[1]) {
                            group.range[1] = localMax;
                            group.name = group.range.map(function(r){return r < 1 ? r.toFixed(4) : r}).toString();
                        }
                        break;
                    }
                } // end group loop
                if (unfound) {
                        var newRange = [localMin,localMax]
                        var newGroup = {
                            name: newRange.map(function(r){return r < 1 ? r.toFixed(4) : r}).toString(),
                            range: newRange,
                            features: [col]
                        }
                        groups.push(newGroup);
                        groups = _.sortBy(groups,sortFuncs);
                }
            }

        } // end data loop

        groups = _.sortBy(groups,sortFuncs);
        return groups;
    },

    byRegex: function(data, regexExpr) {
        var re = new RegExp(regexExpr);

        var result = _.chain(data)
            .groupBy(function(d){ return d.name.match(re);})
            .pairs()
            .map(function (currentItem) {
                return _.object(_.zip(["name", "features"], currentItem));
            })
            .value();
        // console.log(result);
        return result;
    }
};

// returns obj {extracted, remainder}
var ExtractFeatures = {
    whereContains: function(data, toContain) {
        var extracted = [],
            remainder = [];
        for (var i = 0, iLen = data.length; i < iLen; i++) {
            var col = data[i];
            if (col.name.contains(toContain)) {
                extracted.push(col);
            } else {
                remainder.push(col);
            }
        }
        return {extracted, remainder};

    },
};