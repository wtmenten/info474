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
        for (var i = 0, iLen = data.length; i < iLen; i++) {
            var col = data[i];
            var localMin = _.min(col.values);
            var localMax = _.max(col.values);
            for (var j = 0, jLen = groups.length; i < jLen; j++) {
                var group = groups[j];
                var isWithinAcceptableMin = localMin >= group.range[0] * 0.5;
                var isWithinAcceptableMax = localMax <= group.range[1] * 1.5;
                if (isWithinAcceptableMin && isWithinAcceptableMax) {
                    group.features.push(col);
                    if (localMin < group.range[0]) {
                        group.range[0] = localMin;
                        group.name = group.range.toString();
                    }
                    if (localMax > group.range[1]) {
                        group.range[1] = localMax;
                        group.name = group.range.toString();
                    }
                } else {
                    var newRange = [localMin,localMax]
                    var newGroup = {
                        name: newRange.toString(),
                        range: newRange,
                        features: [col]
                    }
                    groups.push(newGroup);
                }
                var sortFuncs =  [
                    function(val){ return val.range[1] - val.range[0]},
                    function(val){ return val.range[0]}
                ];
                groups = _.sortBy(groups,sortFuncs);
            }
        }
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