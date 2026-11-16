/*
 * Bazi core, ported from jinchenma94/bazi-skill (MIT).
 * Four pillars only: precise solar terms, Beijing time, early/late Zi hour.
 * No lunar-date conversion, luck cycles or shensha.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BaziCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var GAN = "甲乙丙丁戊己庚辛壬癸";
  var ZHI = "子丑寅卯辰巳午未申酉戌亥";
  var GAN_ELEMENTS = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
  var ZHI_ELEMENTS = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
  var ELEMENT_LABELS = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
  var ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"];
  var JIE_DEFS = [
    { longitude: 315, name: "立春", zhi: 2 },
    { longitude: 345, name: "惊蛰", zhi: 3 },
    { longitude: 15, name: "清明", zhi: 4 },
    { longitude: 45, name: "立夏", zhi: 5 },
    { longitude: 75, name: "芒种", zhi: 6 },
    { longitude: 105, name: "小暑", zhi: 7 },
    { longitude: 135, name: "立秋", zhi: 8 },
    { longitude: 165, name: "白露", zhi: 9 },
    { longitude: 195, name: "寒露", zhi: 10 },
    { longitude: 225, name: "立冬", zhi: 11 },
    { longitude: 255, name: "大雪", zhi: 0 },
    { longitude: 285, name: "小寒", zhi: 1 }
  ];
  var YUE_GAN_YIN = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  var ZI_SHI_GAN = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
  var J2000 = 2451545.0;
  var UNIX_JD = 2440587.5;

  var termCache = {};
  var eventCache = {};

  function mod(value, base) {
    return ((value % base) + base) % base;
  }

  function deltaTSeconds(year) {
    var y = Number(year);
    var t = y - 2000.0;
    var t1;
    if (y < 1920) {
      t1 = y - 1900.0;
      return -2.79 + 1.494119 * t1 - 0.0598939 * Math.pow(t1, 2) + 0.0061966 * Math.pow(t1, 3) - 0.000197 * Math.pow(t1, 4);
    }
    if (y < 1941) {
      t1 = y - 1920.0;
      return 21.2 + 0.84493 * t1 - 0.0761 * Math.pow(t1, 2) + 0.0020936 * Math.pow(t1, 3);
    }
    if (y < 1961) {
      t1 = y - 1950.0;
      return 29.07 + 0.407 * t1 - Math.pow(t1, 2) / 233.0 + Math.pow(t1, 3) / 2547.0;
    }
    if (y < 1986) {
      t1 = y - 1975.0;
      return 45.45 + 1.067 * t1 - Math.pow(t1, 2) / 260.0 - Math.pow(t1, 3) / 718.0;
    }
    if (y < 2005) {
      t1 = y - 2000.0;
      return 63.86 + 0.3345 * t1 - 0.060374 * Math.pow(t1, 2) + 0.0017275 * Math.pow(t1, 3) + 0.000651814 * Math.pow(t1, 4) + 0.00002373599 * Math.pow(t1, 5);
    }
    if (y < 2050) {
      return 62.92 + 0.32217 * t + 0.005589 * t * t;
    }
    return -20.0 + 32.0 * Math.pow((y - 1820.0) / 100.0, 2) - 0.5628 * (2150.0 - y);
  }

  function sunApparentLongitude(jdTT) {
    var T = (jdTT - J2000) / 36525.0;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var mr = (M * Math.PI) / 180.0;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(mr)
      + (0.019993 - 0.000101 * T) * Math.sin(2.0 * mr)
      + 0.000289 * Math.sin(3.0 * mr);
    var omega = 125.04 - 1934.136 * T;
    var lambda = L0 + C - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180.0);
    return mod(lambda, 360.0);
  }

  function lonDelta(actual, target) {
    return mod(actual - target + 180.0, 360.0) - 180.0;
  }

  function solarTermJd(year, longitude) {
    var key = year + ":" + longitude;
    if (termCache[key] != null) return termCache[key];
    var target = mod(longitude, 360.0);
    var deltaLon = mod(target - 280.46646, 360.0);
    var jd0 = J2000 + (year - 2000) * 365.242189 + deltaLon / 0.98564736;
    var lo = jd0 - 8.0;
    var hi = jd0 + 8.0;
    for (var i = 0; i < 52; i += 1) {
      var mid = (lo + hi) / 2.0;
      if (lonDelta(sunApparentLongitude(mid), target) < 0) lo = mid;
      else hi = mid;
    }
    var result = (lo + hi) / 2.0;
    termCache[key] = result;
    return result;
  }

  function solarTermMs(year, longitude) {
    var jdTT = solarTermJd(year, longitude);
    var approxYear = 2000.0 + (jdTT - J2000) / 365.242189;
    var utcJd = jdTT - deltaTSeconds(approxYear) / 86400.0;
    return (utcJd - UNIX_JD) * 86400000.0;
  }

  function jieEvents(year) {
    var key = String(year);
    if (eventCache[key]) return eventCache[key];
    var events = [];
    for (var y = year - 1; y <= year + 1; y += 1) {
      for (var i = 0; i < JIE_DEFS.length; i += 1) {
        var definition = JIE_DEFS[i];
        events.push({
          ms: solarTermMs(y, definition.longitude),
          name: definition.name,
          zhi: definition.zhi,
          year: y
        });
      }
    }
    events.sort(function (a, b) { return a.ms - b.ms; });
    eventCache[key] = events;
    return events;
  }

  function beijingToUtcMs(year, month, day, hour, minute) {
    return Date.UTC(year, month - 1, day, hour - 8, minute, 0, 0);
  }

  function jdn(year, month, day) {
    var a = Math.floor((14 - month) / 12);
    var y = year + 4800 - a;
    var m = month + 12 * a - 3;
    return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  function gz(index) {
    var value = mod(index, 60);
    return { gan: GAN[value % 10], zhi: ZHI[value % 12], ganIndex: value % 10, zhiIndex: value % 12, index: value };
  }

  function shiftClock(year, month, day, hour, minute, offsetMinutes) {
    var date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    date.setUTCMinutes(date.getUTCMinutes() + offsetMinutes);
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes()
    };
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function equationOfTimeMinutes(year, month, day) {
    var start = Date.UTC(year, 0, 1);
    var date = Date.UTC(year, month - 1, day);
    var dayOfYear = Math.floor((date - start) / 86400000) + 1;
    var b = (2 * Math.PI * (dayOfYear - 81)) / 364;
    return Number((9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)).toFixed(1));
  }

  function dayunFor(birthMs, yearGanIndex, monthGanIndex, monthZhiIndex, gender) {
    if (gender !== "male" && gender !== "female") return null;
    var forward = (yearGanIndex % 2 === 0 && gender === "male") || (yearGanIndex % 2 === 1 && gender === "female");
    var events = jieEvents(new Date(birthMs).getUTCFullYear());
    var target = null;
    for (var i = 0; i < events.length; i += 1) {
      if (forward && events[i].ms > birthMs) {
        target = events[i];
        break;
      }
      if (!forward && events[i].ms <= birthMs) {
        target = events[i];
      }
    }
    if (!target) return null;
    var days = Math.abs(target.ms - birthMs) / 86400000;
    var rawAge = days / 3;
    var startYear = Math.floor(rawAge);
    var startMonth = Math.round((rawAge - startYear) * 12);
    if (startMonth >= 12) {
      startYear += 1;
      startMonth = 0;
    }
    var startAge = Number((startYear + startMonth / 12).toFixed(2));
    var direction = forward ? 1 : -1;
    var cycles = [];
    for (var step = 1; step <= 8; step += 1) {
      var ganIndex = mod(monthGanIndex + direction * step, 10);
      var zhiIndex = mod(monthZhiIndex + direction * step, 12);
      var cycleStart = Number((startAge + (step - 1) * 10).toFixed(1));
      var cycleEnd = Number((startAge + step * 10).toFixed(1));
      cycles.push({
        index: step,
        ganZhi: GAN[ganIndex] + ZHI[zhiIndex],
        startAge: cycleStart,
        endAge: cycleEnd,
        label: cycleStart + "—" + cycleEnd + "岁"
      });
    }
    return {
      direction: forward ? "顺行" : "逆行",
      startAge: startAge,
      startYear: startYear,
      startMonth: startMonth,
      startText: "约" + startYear + "岁" + (startMonth ? startMonth + "个月" : "") + "起运",
      targetJie: target.name,
      daysToJie: Number(days.toFixed(2)),
      cycles: cycles
    };
  }

  function computeBazi(dateValue, timeValue, options) {
    var opts = options || {};
    var parts = String(dateValue || "").split("-").map(Number);
    var year = parts[0];
    var month = parts[1];
    var day = parts[2];
    var timeParts = String(timeValue || "12:00").split(":").map(Number);
    var hour = Number.isFinite(timeParts[0]) ? timeParts[0] : 12;
    var minute = Number.isFinite(timeParts[1]) ? timeParts[1] : 0;
    if (!year || !month || !day || hour < 0 || hour > 23) return null;

    var rawLongitude = opts.longitude;
    var hasLongitude = rawLongitude !== null && rawLongitude !== undefined && rawLongitude !== "" && Number.isFinite(Number(rawLongitude));
    var longitude = hasLongitude ? Number(rawLongitude) : null;
    var longitudeMinutes = hasLongitude ? Number(((longitude - 120) * 4).toFixed(1)) : 0;
    var eotMinutes = hasLongitude ? equationOfTimeMinutes(year, month, day) : 0;
    var correction = hasLongitude ? Number((longitudeMinutes + eotMinutes).toFixed(1)) : 0;
    var adjusted = correction ? shiftClock(year, month, day, hour, minute, correction) : { year: year, month: month, day: day, hour: hour, minute: minute };
    year = adjusted.year;
    month = adjusted.month;
    day = adjusted.day;
    hour = adjusted.hour;
    minute = adjusted.minute;

    var birthMs = beijingToUtcMs(year, month, day, hour, minute);
    var lichunMs = solarTermMs(year, 315);
    var pillarYear = birthMs >= lichunMs ? year : year - 1;
    var yearIndex = mod(pillarYear - 4, 60);
    var yearGanIndex = yearIndex % 10;

    var events = jieEvents(year);
    var currentJie = null;
    for (var i = 0; i < events.length; i += 1) {
      if (events[i].ms <= birthMs) currentJie = events[i];
      else break;
    }
    if (!currentJie) return null;
    var monthZhiIndex = currentJie.zhi;
    var monthStep = mod(monthZhiIndex - 2, 12);
    var monthGanIndex = mod(YUE_GAN_YIN[yearGanIndex] + monthStep, 10);

    var usedYear = year;
    var usedMonth = month;
    var usedDay = day;
    if (hour >= 23) {
      var next = new Date(Date.UTC(year, month - 1, day + 1));
      usedYear = next.getUTCFullYear();
      usedMonth = next.getUTCMonth() + 1;
      usedDay = next.getUTCDate();
    }
    var dayIndex = mod(jdn(usedYear, usedMonth, usedDay) + 49, 60);
    var dayGanIndex = dayIndex % 10;
    var hourZhiIndex = (hour >= 23 || hour < 1) ? 0 : Math.floor((hour + 1) / 2) % 12;
    var hourGanIndex = mod(ZI_SHI_GAN[dayGanIndex] + hourZhiIndex, 10);

    var pillars = [
      { label: "年柱", value: GAN[yearGanIndex] + ZHI[yearIndex % 12], gan: GAN[yearGanIndex], zhi: ZHI[yearIndex % 12] },
      { label: "月柱", value: GAN[monthGanIndex] + ZHI[monthZhiIndex], gan: GAN[monthGanIndex], zhi: ZHI[monthZhiIndex] },
      { label: "日柱", value: GAN[dayGanIndex] + ZHI[dayIndex % 12], gan: GAN[dayGanIndex], zhi: ZHI[dayIndex % 12] },
      { label: "时柱", value: GAN[hourGanIndex] + ZHI[hourZhiIndex], gan: GAN[hourGanIndex], zhi: ZHI[hourZhiIndex] }
    ];

    var counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    pillars.forEach(function (pillar) {
      counts[GAN_ELEMENTS[GAN.indexOf(pillar.gan)]] += 1;
      counts[ZHI_ELEMENTS[ZHI.indexOf(pillar.zhi)]] += 1;
    });

    var dominant = ELEMENT_ORDER[0];
    var weakest = ELEMENT_ORDER[0];
    ELEMENT_ORDER.forEach(function (element) {
      if (counts[element] > counts[dominant]) dominant = element;
      if (counts[element] < counts[weakest]) weakest = element;
    });
    var dayMaster = GAN_ELEMENTS[dayGanIndex];
    var dayun = dayunFor(birthMs, yearGanIndex, monthGanIndex, monthZhiIndex, opts.gender);

    return {
      pillars: pillars.map(function (pillar) { return { label: pillar.label, value: pillar.value }; }),
      counts: counts,
      dominant: dominant,
      weakest: weakest,
      dayMaster: dayMaster,
      dayMasterStem: GAN[dayGanIndex],
      hourBranchLabel: ZHI[hourZhiIndex] + "时",
      monthJie: currentJie.name,
      monthJieYear: currentJie.year,
      calculation: correction ? "beijing-solar-term-true-solar" : "beijing-solar-term",
      methodLabel: correction ? "北京时间 · 节气排盘 · 真太阳时" : "北京时间 · 节气排盘",
      solarCorrection: correction
        ? { longitude: longitude, longitudeMinutes: longitudeMinutes, eotMinutes: eotMinutes, minutes: correction }
        : null,
      trueSolarTime: pad2(hour) + ":" + pad2(minute),
      dayun: dayun
    };
  }

  return {
    computeBazi: computeBazi,
    solarTermMs: solarTermMs,
    solarTermJd: solarTermJd,
    jieEvents: jieEvents,
    ELEMENT_LABELS: ELEMENT_LABELS
  };
});
