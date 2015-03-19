"use strict";

function getDiff(time_a, time_b) {
    var diff = time_b - time_a,
        sign = diff < 0,
        s,
        m,
        h,
        d,
        mo,
        a;

    diff = Math.abs(diff);

    s = Math.floor(diff % 60);
    diff = Math.floor(diff / 60);

    m = Math.floor(diff % 60);
    diff = Math.floor(diff / 60);

    h = Math.floor(diff % 24);
    diff = Math.floor(diff / 24);

    d = Math.floor(diff % 30.4375);
    diff = Math.floor(diff / 30.4375);

    mo = Math.floor(diff % 12);
    a = Math.floor(diff / 12);

    return {
        sign: sign,
        s: s,
        m: m,
        h: h,
        d: d,
        mo: mo,
        a: a
    };
}

function getTwoMostSignificant(time) {
    if (time.a !== 0) {
        return {
            sign: time.sign,
            val: [ { type: "a",
                     val: time.a },
                   { type: "mo",
                     val: time.mo },
                   { type: "d",
                     val: time.d }]
        };
    } else if (time.mo !== 0) {
        return {
            sign: time.sign,
            val: [ { type: "mo",
                     val: time.mo },
                   { type: "d",
                     val: time.d } ]
        };
    } else if (time.d !== 0) {
        return {
            sign: time.sign,
            val: [ { type: "d",
                     val: time.d },
                   { type: "h",
                     val: time.h } ]
        };
    } else if (time.h !== 0) {
        return {
            sign: time.sign,
            val: [ { type: "h",
                     val: time.h },
                   { type: "m",
                     val: time.m } ]
        };
    } else if (time.m !== 0) {
        return {
            sign: time.sign,
            val: [ { type: "m",
                     val: time.m } ]
        };
    } else {
        return {
            sign: time.sign,
            val: 0
        };
    }
}

function formatNumString(o) {
    var type = o.type,
        val = o.val,
        formatter = {
            m: "min",
            s: "sec",
            h: "h",
            d: "d",
            mo: "m",
            a: "y"
        };

    if (formatter[type].constructor === Array) {
        return val + " " + formatter[type][val === 1 ? 0 : 1];
    } else {
        return val + formatter[type];
    }
}

function formatNicetime(time) {
    var two = getTwoMostSignificant(time),
        numstring;

    if (two.val === 0) {
        return "Just Now";
    } else {
        numstring = two.val.filter(function (o) {return o.val !== 0; })
                           .map(formatNumString)
                           .join(" and ");
        
        if (time.sign) {
            return numstring + " ago";
        } else {
            return "in " + numstring;
        }
    }
}

module.exports = function nicetime(a, b) {
    if (b === undefined || b === null) { b = new Date().getTime() / 1000; }
    return formatNicetime(getDiff(b, a));
};