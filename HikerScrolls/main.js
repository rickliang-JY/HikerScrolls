"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/gpx-parser.ts
function parseGpx(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid GPX file");
  }
  const name = getText(doc, "metadata > name") || getText(doc, "trk > name") || "Unnamed Trail";
  const description = getText(doc, "metadata > desc") || getText(doc, "trk > desc") || "";
  const trackPoints = [];
  doc.querySelectorAll("trkpt").forEach((el) => {
    const lat = parseFloat(el.getAttribute("lat") || "0");
    const lng = parseFloat(el.getAttribute("lon") || "0");
    if (lat || lng) {
      trackPoints.push({
        lat,
        lng,
        ele: getNum(el, "ele"),
        time: getText(el, "time") || void 0
      });
    }
  });
  if (trackPoints.length === 0) {
    doc.querySelectorAll("rtept").forEach((el) => {
      const lat = parseFloat(el.getAttribute("lat") || "0");
      const lng = parseFloat(el.getAttribute("lon") || "0");
      if (lat || lng) {
        trackPoints.push({
          lat,
          lng,
          ele: getNum(el, "ele"),
          time: getText(el, "time") || void 0
        });
      }
    });
  }
  const waypoints = [];
  doc.querySelectorAll("wpt").forEach((el) => {
    const lat = parseFloat(el.getAttribute("lat") || "0");
    const lng = parseFloat(el.getAttribute("lon") || "0");
    if (lat || lng) {
      waypoints.push({
        lat,
        lng,
        ele: getNum(el, "ele"),
        name: getText(el, "name") || void 0,
        desc: getText(el, "desc") || void 0
      });
    }
  });
  const allPoints = [...trackPoints, ...waypoints];
  if (allPoints.length === 0) {
    throw new Error("GPX file contains no data");
  }
  const lats = allPoints.map((p2) => p2.lat);
  const lngs = allPoints.map((p2) => p2.lng);
  const bounds = {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
  const latPad = (bounds.north - bounds.south) * 0.1 || 0.01;
  const lngPad = (bounds.east - bounds.west) * 0.1 || 0.01;
  bounds.north += latPad;
  bounds.south -= latPad;
  bounds.east += lngPad;
  bounds.west -= lngPad;
  let totalDistanceKm = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;
  for (let i2 = 1; i2 < trackPoints.length; i2++) {
    const prev = trackPoints[i2 - 1];
    const curr = trackPoints[i2];
    totalDistanceKm += haversineKm(prev.lat, prev.lng, curr.lat, curr.lng);
    if (prev.ele != null && curr.ele != null) {
      const diff = curr.ele - prev.ele;
      if (diff > 0)
        elevationGainM += diff;
      else
        elevationLossM += Math.abs(diff);
    }
  }
  return {
    name,
    description,
    trackPoints,
    waypoints,
    bounds,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM)
  };
}
function simplifyTrack(points, tolerance = 1e-4) {
  if (points.length <= 2)
    return points;
  let maxDist = 0;
  let maxIdx = 0;
  for (let i2 = 1; i2 < points.length - 1; i2++) {
    const d2 = perpendicularDist(points[i2], points[0], points[points.length - 1]);
    if (d2 > maxDist) {
      maxDist = d2;
      maxIdx = i2;
    }
  }
  if (maxDist > tolerance) {
    const left = simplifyTrack(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyTrack(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}
function getText(el, selector) {
  return el.querySelector(selector)?.textContent?.trim() || null;
}
function getNum(el, selector) {
  const t2 = getText(el, selector);
  return t2 ? isNaN(+t2) ? void 0 : +t2 : void 0;
}
function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}
function toRad(deg) {
  return deg * Math.PI / 180;
}
function perpendicularDist(p2, lineStart, lineEnd) {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0)
    return Math.sqrt((p2.lng - lineStart.lng) ** 2 + (p2.lat - lineStart.lat) ** 2);
  return Math.abs(dy * p2.lng - dx * p2.lat + lineEnd.lng * lineStart.lat - lineEnd.lat * lineStart.lng) / len;
}
var init_gpx_parser = __esm({
  "src/gpx-parser.ts"() {
    "use strict";
  }
});

// src/plt-parser.ts
function parsePlt(text) {
  const lines = text.split(/\r?\n/).filter((l2) => l2.trim().length > 0);
  if (lines.length < 7) {
    throw new Error("PLT file too short \u2014 expected header + data lines");
  }
  if (!lines[0].toLowerCase().includes("track point file")) {
    throw new Error("Not a valid OziExplorer PLT file");
  }
  const altInFeet = lines[2].toLowerCase().includes("feet");
  const headerFields = lines[4].split(",");
  const name = headerFields.length >= 4 ? headerFields[3].trim() : "PLT Track";
  const trackPoints = [];
  for (let i2 = 6; i2 < lines.length; i2++) {
    const parts = lines[i2].split(",").map((s2) => s2.trim());
    if (parts.length < 5)
      continue;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    const altRaw = parseFloat(parts[3]);
    const daysFloat = parseFloat(parts[4]);
    if (isNaN(lat) || isNaN(lng) || lat === 0 && lng === 0)
      continue;
    let ele;
    if (!isNaN(altRaw) && altRaw > -1e3) {
      ele = altInFeet ? Math.round(altRaw * 0.3048) : Math.round(altRaw);
    }
    let time;
    if (!isNaN(daysFloat) && daysFloat > 0) {
      const ms = OZI_EPOCH + daysFloat * 864e5;
      time = new Date(ms).toISOString();
    }
    if (!time && parts.length >= 7 && parts[5] && parts[6]) {
      try {
        const dt2 = /* @__PURE__ */ new Date(`${parts[5].trim()} ${parts[6].trim()}`);
        if (!isNaN(dt2.getTime()))
          time = dt2.toISOString();
      } catch {
      }
    }
    trackPoints.push({ lat, lng, ele, time });
  }
  if (trackPoints.length === 0) {
    throw new Error("PLT file contains no valid track points");
  }
  return {
    name: name || "PLT Track",
    ...computeStats(trackPoints)
  };
}
function computeStats(trackPoints) {
  const lats = trackPoints.map((p2) => p2.lat);
  const lngs = trackPoints.map((p2) => p2.lng);
  const pad = 0.01;
  const bounds = {
    north: Math.max(...lats) + pad,
    south: Math.min(...lats) - pad,
    east: Math.max(...lngs) + pad,
    west: Math.min(...lngs) - pad
  };
  let totalDistanceKm = 0, elevationGainM = 0, elevationLossM = 0;
  for (let i2 = 1; i2 < trackPoints.length; i2++) {
    const a2 = trackPoints[i2 - 1], b2 = trackPoints[i2];
    totalDistanceKm += haversineKm2(a2.lat, a2.lng, b2.lat, b2.lng);
    if (a2.ele != null && b2.ele != null) {
      const d2 = b2.ele - a2.ele;
      if (d2 > 0)
        elevationGainM += d2;
      else
        elevationLossM += Math.abs(d2);
    }
  }
  return {
    trackPoints,
    bounds,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM)
  };
}
function haversineKm2(lat1, lng1, lat2, lng2) {
  const R2 = 6371, toRad2 = (d2) => d2 * Math.PI / 180;
  const dLat = toRad2(lat2 - lat1), dLng = toRad2(lng2 - lng1);
  const a2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad2(lat1)) * Math.cos(toRad2(lat2)) * Math.sin(dLng / 2) ** 2;
  return R2 * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}
var OZI_EPOCH;
var init_plt_parser = __esm({
  "src/plt-parser.ts"() {
    "use strict";
    OZI_EPOCH = new Date(1899, 11, 30).getTime();
  }
});

// src/kml-parser.ts
function parseKml(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid KML file");
  }
  const name = getText2(doc, "Document > name") || getText2(doc, "Folder > name") || "KML Track";
  const description = getText2(doc, "Document > description") || "";
  const trackPoints = [];
  const waypoints = [];
  doc.querySelectorAll("LineString coordinates, LinearRing coordinates").forEach((el) => {
    const coords = parseCoordinateString(el.textContent || "");
    trackPoints.push(...coords);
  });
  const gxTracks = doc.querySelectorAll("Track");
  gxTracks.forEach((track) => {
    const coords = track.querySelectorAll("coord");
    const whens = track.querySelectorAll("when");
    coords.forEach((coord, i2) => {
      const parts = (coord.textContent || "").trim().split(/\s+/);
      if (parts.length >= 2) {
        const lng = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        const ele = parts.length >= 3 ? parseFloat(parts[2]) : void 0;
        const time = i2 < whens.length ? (whens[i2].textContent || "").trim() : void 0;
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          trackPoints.push({ lat, lng, ele: ele != null && !isNaN(ele) ? ele : void 0, time: time || void 0 });
        }
      }
    });
  });
  doc.querySelectorAll("Placemark").forEach((pm) => {
    const point = pm.querySelector("Point coordinates");
    if (point) {
      const coords = parseCoordinateString(point.textContent || "");
      if (coords.length > 0) {
        const c2 = coords[0];
        waypoints.push({
          lat: c2.lat,
          lng: c2.lng,
          ele: c2.ele,
          name: getText2(pm, "name") || void 0,
          desc: getText2(pm, "description") || void 0
        });
      }
    }
  });
  const allPoints = [...trackPoints, ...waypoints.map((w2) => ({ lat: w2.lat, lng: w2.lng }))];
  if (allPoints.length === 0) {
    throw new Error("KML file contains no geographic data");
  }
  const lats = allPoints.map((p2) => p2.lat);
  const lngs = allPoints.map((p2) => p2.lng);
  const pad = (Math.max(...lats) - Math.min(...lats)) * 0.1 || 0.01;
  const lngPad = (Math.max(...lngs) - Math.min(...lngs)) * 0.1 || 0.01;
  const bounds = {
    north: Math.max(...lats) + pad,
    south: Math.min(...lats) - pad,
    east: Math.max(...lngs) + lngPad,
    west: Math.min(...lngs) - lngPad
  };
  let totalDistanceKm = 0, elevationGainM = 0, elevationLossM = 0;
  for (let i2 = 1; i2 < trackPoints.length; i2++) {
    const a2 = trackPoints[i2 - 1], b2 = trackPoints[i2];
    totalDistanceKm += haversineKm3(a2.lat, a2.lng, b2.lat, b2.lng);
    if (a2.ele != null && b2.ele != null) {
      const d2 = b2.ele - a2.ele;
      if (d2 > 0)
        elevationGainM += d2;
      else
        elevationLossM += Math.abs(d2);
    }
  }
  return {
    name,
    description,
    trackPoints,
    waypoints,
    bounds,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM)
  };
}
async function extractKmlFromKmz(buffer) {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  let offset = 0;
  while (offset < buffer.byteLength - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 67324752)
      break;
    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const fileName = decoder.decode(new Uint8Array(buffer, offset + 30, nameLen));
    const dataOffset = offset + 30 + nameLen + extraLen;
    if (fileName.toLowerCase().endsWith(".kml")) {
      if (compressionMethod === 0) {
        return decoder.decode(new Uint8Array(buffer, dataOffset, uncompressedSize));
      } else if (compressionMethod === 8) {
        const compressed = new Uint8Array(buffer, dataOffset, compressedSize);
        const ds = new DecompressionStream("raw");
        const writer = ds.writable.getWriter();
        writer.write(compressed);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks = [];
        let done = false;
        while (!done) {
          const r2 = await reader.read();
          if (r2.done)
            done = true;
          else
            chunks.push(r2.value);
        }
        const total = chunks.reduce((s2, c2) => s2 + c2.length, 0);
        const result = new Uint8Array(total);
        let pos = 0;
        for (const c2 of chunks) {
          result.set(c2, pos);
          pos += c2.length;
        }
        return decoder.decode(result);
      }
    }
    offset = dataOffset + compressedSize;
  }
  throw new Error("KMZ file does not contain a .kml file");
}
function parseCoordinateString(text) {
  const points = [];
  const tuples = text.trim().split(/\s+/);
  for (const tuple of tuples) {
    const parts = tuple.split(",");
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const ele = parts.length >= 3 ? parseFloat(parts[2]) : void 0;
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        points.push({ lat, lng, ele: ele != null && !isNaN(ele) ? ele : void 0 });
      }
    }
  }
  return points;
}
function getText2(el, selector) {
  return el.querySelector(selector)?.textContent?.trim() || null;
}
function haversineKm3(lat1, lng1, lat2, lng2) {
  const R2 = 6371, toRad2 = (d2) => d2 * Math.PI / 180;
  const dLat = toRad2(lat2 - lat1), dLng = toRad2(lng2 - lng1);
  const a2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad2(lat1)) * Math.cos(toRad2(lat2)) * Math.sin(dLng / 2) ** 2;
  return R2 * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}
var init_kml_parser = __esm({
  "src/kml-parser.ts"() {
    "use strict";
  }
});

// src/fit-parser.ts
function parseFit(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const headerSize = bytes[0];
  if (headerSize < 12)
    throw new Error("Invalid FIT file header");
  const protocolVersion = bytes[1];
  const profileVersion = view.getUint16(2, true);
  const dataSize = view.getUint32(4, true);
  const dataType = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  if (dataType !== ".FIT")
    throw new Error("Not a FIT file (missing .FIT signature)");
  let offset = headerSize;
  const endOffset = headerSize + dataSize;
  const localDefs = {};
  const trackPoints = [];
  let sessionName = "";
  while (offset < endOffset && offset < buffer.byteLength - 1) {
    const recordHeader = bytes[offset];
    offset++;
    const isCompressedTimestamp = (recordHeader & 128) !== 0;
    if (isCompressedTimestamp) {
      const localType2 = recordHeader >> 5 & 3;
      const def = localDefs[localType2];
      if (!def) {
        offset += guessRecordSize(def);
        continue;
      }
      offset = readDataMessage(view, bytes, offset, def, trackPoints, (n2) => {
        if (!sessionName)
          sessionName = n2;
      });
      continue;
    }
    const isDefinition = (recordHeader & 64) !== 0;
    const localType = recordHeader & 15;
    if (isDefinition) {
      offset++;
      const arch = bytes[offset];
      offset++;
      const globalMesgNum = arch === 0 ? view.getUint16(offset, true) : view.getUint16(offset, false);
      offset += 2;
      const numFields = bytes[offset];
      offset++;
      const fields = [];
      for (let f2 = 0; f2 < numFields; f2++) {
        const fieldNum = bytes[offset];
        const size = bytes[offset + 1];
        const baseType = bytes[offset + 2] & 31;
        fields.push({ fieldNum, size, baseType });
        offset += 3;
      }
      if ((recordHeader & 32) !== 0) {
        const numDevFields = bytes[offset];
        offset++;
        offset += numDevFields * 3;
      }
      localDefs[localType] = { arch, globalMesgNum, fields };
    } else {
      const def = localDefs[localType];
      if (!def) {
        break;
      }
      offset = readDataMessage(view, bytes, offset, def, trackPoints, (n2) => {
        if (!sessionName)
          sessionName = n2;
      });
    }
  }
  if (trackPoints.length === 0) {
    throw new Error("FIT file contains no GPS track data");
  }
  const lats = trackPoints.map((p2) => p2.lat);
  const lngs = trackPoints.map((p2) => p2.lng);
  const pad = (Math.max(...lats) - Math.min(...lats)) * 0.1 || 0.01;
  const lngPad = (Math.max(...lngs) - Math.min(...lngs)) * 0.1 || 0.01;
  const bounds = {
    north: Math.max(...lats) + pad,
    south: Math.min(...lats) - pad,
    east: Math.max(...lngs) + lngPad,
    west: Math.min(...lngs) - lngPad
  };
  let totalDistanceKm = 0, elevationGainM = 0, elevationLossM = 0;
  for (let i2 = 1; i2 < trackPoints.length; i2++) {
    const a2 = trackPoints[i2 - 1], b2 = trackPoints[i2];
    totalDistanceKm += haversineKm4(a2.lat, a2.lng, b2.lat, b2.lng);
    if (a2.ele != null && b2.ele != null) {
      const d2 = b2.ele - a2.ele;
      if (d2 > 0)
        elevationGainM += d2;
      else
        elevationLossM += Math.abs(d2);
    }
  }
  return {
    name: sessionName || "FIT Activity",
    trackPoints,
    bounds,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM)
  };
}
function readDataMessage(view, bytes, offset, def, trackPoints, onName) {
  const le2 = def.arch === 0;
  const fieldValues = {};
  for (const field of def.fields) {
    const start = offset;
    offset += field.size;
    if (def.globalMesgNum === 20 || def.globalMesgNum === 18 || def.globalMesgNum === 0) {
      fieldValues[field.fieldNum] = readFieldValue(view, bytes, start, field, le2);
    }
  }
  if (def.globalMesgNum === 20) {
    const latRaw = fieldValues[0];
    const lngRaw = fieldValues[1];
    if (latRaw != null && lngRaw != null && latRaw !== 2147483647 && lngRaw !== 2147483647 && latRaw !== 0 && lngRaw !== 0) {
      const lat = latRaw * SEMICIRCLE_TO_DEG;
      const lng = lngRaw * SEMICIRCLE_TO_DEG;
      let ele;
      const altRaw = fieldValues[2];
      if (altRaw != null && altRaw !== 65535) {
        ele = Math.round((altRaw / 5 - 500) * 10) / 10;
      }
      const enhAlt = fieldValues[78];
      if (enhAlt != null && enhAlt !== 4294967295) {
        ele = Math.round((enhAlt / 5 - 500) * 10) / 10;
      }
      let time;
      const ts = fieldValues[253];
      if (ts != null && ts !== 4294967295) {
        time = new Date(GARMIN_EPOCH + ts * 1e3).toISOString();
      }
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        trackPoints.push({ lat, lng, ele, time });
      }
    }
  }
  if (def.globalMesgNum === 18) {
  }
  return offset;
}
function readFieldValue(view, bytes, offset, field, le2) {
  const bt = field.baseType;
  try {
    switch (bt) {
      case 0:
      case 2:
      case 10:
        return bytes[offset];
      case 1:
        return view.getInt8(offset);
      case 3:
        return view.getInt16(offset, le2);
      case 4:
      case 11:
        return view.getUint16(offset, le2);
      case 5:
        return view.getInt32(offset, le2);
      case 6:
      case 12:
        return view.getUint32(offset, le2);
      case 8:
        return view.getFloat32(offset, le2);
      case 9:
        return view.getFloat64(offset, le2);
      case 7:
        return new TextDecoder().decode(bytes.slice(offset, offset + field.size)).replace(/\0/g, "");
      default:
        return 0;
    }
  } catch {
    return 0;
  }
}
function guessRecordSize(def) {
  if (!def)
    return 0;
  return def.fields.reduce((sum, f2) => sum + f2.size, 0);
}
function haversineKm4(lat1, lng1, lat2, lng2) {
  const R2 = 6371, toRad2 = (d2) => d2 * Math.PI / 180;
  const dLat = toRad2(lat2 - lat1), dLng = toRad2(lng2 - lng1);
  const a2 = Math.sin(dLat / 2) ** 2 + Math.cos(toRad2(lat1)) * Math.cos(toRad2(lat2)) * Math.sin(dLng / 2) ** 2;
  return R2 * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}
var GARMIN_EPOCH, SEMICIRCLE_TO_DEG;
var init_fit_parser = __esm({
  "src/fit-parser.ts"() {
    "use strict";
    GARMIN_EPOCH = Date.UTC(1989, 11, 31, 0, 0, 0);
    SEMICIRCLE_TO_DEG = 180 / Math.pow(2, 31);
  }
});

// src/track-parser.ts
var track_parser_exports = {};
__export(track_parser_exports, {
  ACCEPT_STRING: () => ACCEPT_STRING,
  detectFormat: () => detectFormat,
  formatLabel: () => formatLabel,
  parseTrackBinary: () => parseTrackBinary,
  parseTrackFile: () => parseTrackFile,
  parseTrackText: () => parseTrackText,
  simplifyTrack: () => simplifyTrack
});
function detectFormat(filename) {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "gpx":
      return "gpx";
    case "plt":
      return "plt";
    case "kml":
      return "kml";
    case "kmz":
      return "kmz";
    case "fit":
      return "fit";
    default:
      return null;
  }
}
function parseTrackText(content, filename) {
  const fmt = detectFormat(filename);
  if (!fmt) {
    if (content.trimStart().startsWith("<?xml") || content.trimStart().startsWith("<gpx")) {
      return parseTrackText(content, "file.gpx");
    }
    if (content.trimStart().startsWith("<kml") || content.includes("<Document>")) {
      return parseTrackText(content, "file.kml");
    }
    if (content.toLowerCase().includes("track point file")) {
      return parseTrackText(content, "file.plt");
    }
    throw new Error(`Cannot detect track format for "${filename}"`);
  }
  switch (fmt) {
    case "gpx": {
      const d2 = parseGpx(content);
      return {
        format: "gpx",
        name: d2.name,
        description: d2.description,
        trackPoints: d2.trackPoints,
        waypoints: d2.waypoints,
        bounds: d2.bounds,
        totalDistanceKm: d2.totalDistanceKm,
        elevationGainM: d2.elevationGainM,
        elevationLossM: d2.elevationLossM
      };
    }
    case "plt": {
      const d2 = parsePlt(content);
      return {
        format: "plt",
        name: d2.name,
        description: "",
        trackPoints: d2.trackPoints,
        waypoints: [],
        bounds: d2.bounds,
        totalDistanceKm: d2.totalDistanceKm,
        elevationGainM: d2.elevationGainM,
        elevationLossM: d2.elevationLossM
      };
    }
    case "kml": {
      const d2 = parseKml(content);
      return {
        format: "kml",
        name: d2.name,
        description: d2.description,
        trackPoints: d2.trackPoints,
        waypoints: d2.waypoints,
        bounds: d2.bounds,
        totalDistanceKm: d2.totalDistanceKm,
        elevationGainM: d2.elevationGainM,
        elevationLossM: d2.elevationLossM
      };
    }
    default:
      throw new Error(`Text parser does not support ${fmt} format. Use parseTrackBinary for binary files.`);
  }
}
async function parseTrackBinary(buffer, filename) {
  const fmt = detectFormat(filename);
  switch (fmt) {
    case "fit": {
      const d2 = parseFit(buffer);
      return {
        format: "fit",
        name: d2.name,
        description: "",
        trackPoints: d2.trackPoints,
        waypoints: [],
        bounds: d2.bounds,
        totalDistanceKm: d2.totalDistanceKm,
        elevationGainM: d2.elevationGainM,
        elevationLossM: d2.elevationLossM
      };
    }
    case "kmz": {
      const kmlContent = await extractKmlFromKmz(buffer);
      const d2 = parseKml(kmlContent);
      return {
        format: "kmz",
        name: d2.name,
        description: d2.description,
        trackPoints: d2.trackPoints,
        waypoints: d2.waypoints,
        bounds: d2.bounds,
        totalDistanceKm: d2.totalDistanceKm,
        elevationGainM: d2.elevationGainM,
        elevationLossM: d2.elevationLossM
      };
    }
    default:
      throw new Error(`Binary parser does not support ${fmt || "unknown"} format.`);
  }
}
async function parseTrackFile(file) {
  const fmt = detectFormat(file.name);
  if (!fmt) {
    throw new Error(`Unsupported file format: ${file.name}`);
  }
  if (fmt === "fit" || fmt === "kmz") {
    const buffer = await file.arrayBuffer();
    return parseTrackBinary(buffer, file.name);
  }
  const text = await file.text();
  return parseTrackText(text, file.name);
}
function formatLabel(fmt) {
  switch (fmt) {
    case "gpx":
      return "GPX";
    case "plt":
      return "PLT (OziExplorer)";
    case "kml":
      return "KML (Google Earth)";
    case "kmz":
      return "KMZ (Google Earth)";
    case "fit":
      return "FIT (Garmin)";
  }
}
var ACCEPT_STRING;
var init_track_parser = __esm({
  "src/track-parser.ts"() {
    "use strict";
    init_gpx_parser();
    init_plt_parser();
    init_kml_parser();
    init_fit_parser();
    init_gpx_parser();
    ACCEPT_STRING = ".gpx,.plt,.kml,.kmz,.fit";
  }
});

// node_modules/leaflet/dist/leaflet-src.js
var require_leaflet_src = __commonJS({
  "node_modules/leaflet/dist/leaflet-src.js"(exports, module2) {
    (function(global2, factory) {
      typeof exports === "object" && typeof module2 !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global2 = typeof globalThis !== "undefined" ? globalThis : global2 || self, factory(global2.leaflet = {}));
    })(exports, function(exports2) {
      "use strict";
      var version = "1.9.4";
      function extend(dest) {
        var i2, j2, len, src;
        for (j2 = 1, len = arguments.length; j2 < len; j2++) {
          src = arguments[j2];
          for (i2 in src) {
            dest[i2] = src[i2];
          }
        }
        return dest;
      }
      var create$2 = Object.create || /* @__PURE__ */ function() {
        function F2() {
        }
        return function(proto) {
          F2.prototype = proto;
          return new F2();
        };
      }();
      function bind(fn, obj) {
        var slice = Array.prototype.slice;
        if (fn.bind) {
          return fn.bind.apply(fn, slice.call(arguments, 1));
        }
        var args = slice.call(arguments, 2);
        return function() {
          return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
        };
      }
      var lastId = 0;
      function stamp(obj) {
        if (!("_leaflet_id" in obj)) {
          obj["_leaflet_id"] = ++lastId;
        }
        return obj._leaflet_id;
      }
      function throttle(fn, time, context) {
        var lock, args, wrapperFn, later;
        later = function() {
          lock = false;
          if (args) {
            wrapperFn.apply(context, args);
            args = false;
          }
        };
        wrapperFn = function() {
          if (lock) {
            args = arguments;
          } else {
            fn.apply(context, arguments);
            setTimeout(later, time);
            lock = true;
          }
        };
        return wrapperFn;
      }
      function wrapNum(x2, range, includeMax) {
        var max = range[1], min = range[0], d2 = max - min;
        return x2 === max && includeMax ? x2 : ((x2 - min) % d2 + d2) % d2 + min;
      }
      function falseFn() {
        return false;
      }
      function formatNum(num, precision) {
        if (precision === false) {
          return num;
        }
        var pow = Math.pow(10, precision === void 0 ? 6 : precision);
        return Math.round(num * pow) / pow;
      }
      function trim(str) {
        return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, "");
      }
      function splitWords(str) {
        return trim(str).split(/\s+/);
      }
      function setOptions(obj, options) {
        if (!Object.prototype.hasOwnProperty.call(obj, "options")) {
          obj.options = obj.options ? create$2(obj.options) : {};
        }
        for (var i2 in options) {
          obj.options[i2] = options[i2];
        }
        return obj.options;
      }
      function getParamString(obj, existingUrl, uppercase) {
        var params = [];
        for (var i2 in obj) {
          params.push(encodeURIComponent(uppercase ? i2.toUpperCase() : i2) + "=" + encodeURIComponent(obj[i2]));
        }
        return (!existingUrl || existingUrl.indexOf("?") === -1 ? "?" : "&") + params.join("&");
      }
      var templateRe = /\{ *([\w_ -]+) *\}/g;
      function template(str, data) {
        return str.replace(templateRe, function(str2, key) {
          var value = data[key];
          if (value === void 0) {
            throw new Error("No value provided for variable " + str2);
          } else if (typeof value === "function") {
            value = value(data);
          }
          return value;
        });
      }
      var isArray = Array.isArray || function(obj) {
        return Object.prototype.toString.call(obj) === "[object Array]";
      };
      function indexOf(array, el) {
        for (var i2 = 0; i2 < array.length; i2++) {
          if (array[i2] === el) {
            return i2;
          }
        }
        return -1;
      }
      var emptyImageUrl = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
      function getPrefixed(name) {
        return window["webkit" + name] || window["moz" + name] || window["ms" + name];
      }
      var lastTime = 0;
      function timeoutDefer(fn) {
        var time = +/* @__PURE__ */ new Date(), timeToCall = Math.max(0, 16 - (time - lastTime));
        lastTime = time + timeToCall;
        return window.setTimeout(fn, timeToCall);
      }
      var requestFn = window.requestAnimationFrame || getPrefixed("RequestAnimationFrame") || timeoutDefer;
      var cancelFn = window.cancelAnimationFrame || getPrefixed("CancelAnimationFrame") || getPrefixed("CancelRequestAnimationFrame") || function(id) {
        window.clearTimeout(id);
      };
      function requestAnimFrame(fn, context, immediate) {
        if (immediate && requestFn === timeoutDefer) {
          fn.call(context);
        } else {
          return requestFn.call(window, bind(fn, context));
        }
      }
      function cancelAnimFrame(id) {
        if (id) {
          cancelFn.call(window, id);
        }
      }
      var Util = {
        __proto__: null,
        extend,
        create: create$2,
        bind,
        get lastId() {
          return lastId;
        },
        stamp,
        throttle,
        wrapNum,
        falseFn,
        formatNum,
        trim,
        splitWords,
        setOptions,
        getParamString,
        template,
        isArray,
        indexOf,
        emptyImageUrl,
        requestFn,
        cancelFn,
        requestAnimFrame,
        cancelAnimFrame
      };
      function Class() {
      }
      Class.extend = function(props) {
        var NewClass = function() {
          setOptions(this);
          if (this.initialize) {
            this.initialize.apply(this, arguments);
          }
          this.callInitHooks();
        };
        var parentProto = NewClass.__super__ = this.prototype;
        var proto = create$2(parentProto);
        proto.constructor = NewClass;
        NewClass.prototype = proto;
        for (var i2 in this) {
          if (Object.prototype.hasOwnProperty.call(this, i2) && i2 !== "prototype" && i2 !== "__super__") {
            NewClass[i2] = this[i2];
          }
        }
        if (props.statics) {
          extend(NewClass, props.statics);
        }
        if (props.includes) {
          checkDeprecatedMixinEvents(props.includes);
          extend.apply(null, [proto].concat(props.includes));
        }
        extend(proto, props);
        delete proto.statics;
        delete proto.includes;
        if (proto.options) {
          proto.options = parentProto.options ? create$2(parentProto.options) : {};
          extend(proto.options, props.options);
        }
        proto._initHooks = [];
        proto.callInitHooks = function() {
          if (this._initHooksCalled) {
            return;
          }
          if (parentProto.callInitHooks) {
            parentProto.callInitHooks.call(this);
          }
          this._initHooksCalled = true;
          for (var i3 = 0, len = proto._initHooks.length; i3 < len; i3++) {
            proto._initHooks[i3].call(this);
          }
        };
        return NewClass;
      };
      Class.include = function(props) {
        var parentOptions = this.prototype.options;
        extend(this.prototype, props);
        if (props.options) {
          this.prototype.options = parentOptions;
          this.mergeOptions(props.options);
        }
        return this;
      };
      Class.mergeOptions = function(options) {
        extend(this.prototype.options, options);
        return this;
      };
      Class.addInitHook = function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        var init = typeof fn === "function" ? fn : function() {
          this[fn].apply(this, args);
        };
        this.prototype._initHooks = this.prototype._initHooks || [];
        this.prototype._initHooks.push(init);
        return this;
      };
      function checkDeprecatedMixinEvents(includes) {
        if (typeof L === "undefined" || !L || !L.Mixin) {
          return;
        }
        includes = isArray(includes) ? includes : [includes];
        for (var i2 = 0; i2 < includes.length; i2++) {
          if (includes[i2] === L.Mixin.Events) {
            console.warn("Deprecated include of L.Mixin.Events: this property will be removed in future releases, please inherit from L.Evented instead.", new Error().stack);
          }
        }
      }
      var Events = {
        /* @method on(type: String, fn: Function, context?: Object): this
         * Adds a listener function (`fn`) to a particular event type of the object. You can optionally specify the context of the listener (object the this keyword will point to). You can also pass several space-separated types (e.g. `'click dblclick'`).
         *
         * @alternative
         * @method on(eventMap: Object): this
         * Adds a set of type/listener pairs, e.g. `{click: onClick, mousemove: onMouseMove}`
         */
        on: function(types, fn, context) {
          if (typeof types === "object") {
            for (var type in types) {
              this._on(type, types[type], fn);
            }
          } else {
            types = splitWords(types);
            for (var i2 = 0, len = types.length; i2 < len; i2++) {
              this._on(types[i2], fn, context);
            }
          }
          return this;
        },
        /* @method off(type: String, fn?: Function, context?: Object): this
         * Removes a previously added listener function. If no function is specified, it will remove all the listeners of that particular event from the object. Note that if you passed a custom context to `on`, you must pass the same context to `off` in order to remove the listener.
         *
         * @alternative
         * @method off(eventMap: Object): this
         * Removes a set of type/listener pairs.
         *
         * @alternative
         * @method off: this
         * Removes all listeners to all events on the object. This includes implicitly attached events.
         */
        off: function(types, fn, context) {
          if (!arguments.length) {
            delete this._events;
          } else if (typeof types === "object") {
            for (var type in types) {
              this._off(type, types[type], fn);
            }
          } else {
            types = splitWords(types);
            var removeAll = arguments.length === 1;
            for (var i2 = 0, len = types.length; i2 < len; i2++) {
              if (removeAll) {
                this._off(types[i2]);
              } else {
                this._off(types[i2], fn, context);
              }
            }
          }
          return this;
        },
        // attach listener (without syntactic sugar now)
        _on: function(type, fn, context, _once) {
          if (typeof fn !== "function") {
            console.warn("wrong listener type: " + typeof fn);
            return;
          }
          if (this._listens(type, fn, context) !== false) {
            return;
          }
          if (context === this) {
            context = void 0;
          }
          var newListener = { fn, ctx: context };
          if (_once) {
            newListener.once = true;
          }
          this._events = this._events || {};
          this._events[type] = this._events[type] || [];
          this._events[type].push(newListener);
        },
        _off: function(type, fn, context) {
          var listeners, i2, len;
          if (!this._events) {
            return;
          }
          listeners = this._events[type];
          if (!listeners) {
            return;
          }
          if (arguments.length === 1) {
            if (this._firingCount) {
              for (i2 = 0, len = listeners.length; i2 < len; i2++) {
                listeners[i2].fn = falseFn;
              }
            }
            delete this._events[type];
            return;
          }
          if (typeof fn !== "function") {
            console.warn("wrong listener type: " + typeof fn);
            return;
          }
          var index2 = this._listens(type, fn, context);
          if (index2 !== false) {
            var listener = listeners[index2];
            if (this._firingCount) {
              listener.fn = falseFn;
              this._events[type] = listeners = listeners.slice();
            }
            listeners.splice(index2, 1);
          }
        },
        // @method fire(type: String, data?: Object, propagate?: Boolean): this
        // Fires an event of the specified type. You can optionally provide a data
        // object — the first argument of the listener function will contain its
        // properties. The event can optionally be propagated to event parents.
        fire: function(type, data, propagate) {
          if (!this.listens(type, propagate)) {
            return this;
          }
          var event = extend({}, data, {
            type,
            target: this,
            sourceTarget: data && data.sourceTarget || this
          });
          if (this._events) {
            var listeners = this._events[type];
            if (listeners) {
              this._firingCount = this._firingCount + 1 || 1;
              for (var i2 = 0, len = listeners.length; i2 < len; i2++) {
                var l2 = listeners[i2];
                var fn = l2.fn;
                if (l2.once) {
                  this.off(type, fn, l2.ctx);
                }
                fn.call(l2.ctx || this, event);
              }
              this._firingCount--;
            }
          }
          if (propagate) {
            this._propagateEvent(event);
          }
          return this;
        },
        // @method listens(type: String, propagate?: Boolean): Boolean
        // @method listens(type: String, fn: Function, context?: Object, propagate?: Boolean): Boolean
        // Returns `true` if a particular event type has any listeners attached to it.
        // The verification can optionally be propagated, it will return `true` if parents have the listener attached to it.
        listens: function(type, fn, context, propagate) {
          if (typeof type !== "string") {
            console.warn('"string" type argument expected');
          }
          var _fn = fn;
          if (typeof fn !== "function") {
            propagate = !!fn;
            _fn = void 0;
            context = void 0;
          }
          var listeners = this._events && this._events[type];
          if (listeners && listeners.length) {
            if (this._listens(type, _fn, context) !== false) {
              return true;
            }
          }
          if (propagate) {
            for (var id in this._eventParents) {
              if (this._eventParents[id].listens(type, fn, context, propagate)) {
                return true;
              }
            }
          }
          return false;
        },
        // returns the index (number) or false
        _listens: function(type, fn, context) {
          if (!this._events) {
            return false;
          }
          var listeners = this._events[type] || [];
          if (!fn) {
            return !!listeners.length;
          }
          if (context === this) {
            context = void 0;
          }
          for (var i2 = 0, len = listeners.length; i2 < len; i2++) {
            if (listeners[i2].fn === fn && listeners[i2].ctx === context) {
              return i2;
            }
          }
          return false;
        },
        // @method once(…): this
        // Behaves as [`on(…)`](#evented-on), except the listener will only get fired once and then removed.
        once: function(types, fn, context) {
          if (typeof types === "object") {
            for (var type in types) {
              this._on(type, types[type], fn, true);
            }
          } else {
            types = splitWords(types);
            for (var i2 = 0, len = types.length; i2 < len; i2++) {
              this._on(types[i2], fn, context, true);
            }
          }
          return this;
        },
        // @method addEventParent(obj: Evented): this
        // Adds an event parent - an `Evented` that will receive propagated events
        addEventParent: function(obj) {
          this._eventParents = this._eventParents || {};
          this._eventParents[stamp(obj)] = obj;
          return this;
        },
        // @method removeEventParent(obj: Evented): this
        // Removes an event parent, so it will stop receiving propagated events
        removeEventParent: function(obj) {
          if (this._eventParents) {
            delete this._eventParents[stamp(obj)];
          }
          return this;
        },
        _propagateEvent: function(e2) {
          for (var id in this._eventParents) {
            this._eventParents[id].fire(e2.type, extend({
              layer: e2.target,
              propagatedFrom: e2.target
            }, e2), true);
          }
        }
      };
      Events.addEventListener = Events.on;
      Events.removeEventListener = Events.clearAllEventListeners = Events.off;
      Events.addOneTimeEventListener = Events.once;
      Events.fireEvent = Events.fire;
      Events.hasEventListeners = Events.listens;
      var Evented = Class.extend(Events);
      function Point(x2, y2, round) {
        this.x = round ? Math.round(x2) : x2;
        this.y = round ? Math.round(y2) : y2;
      }
      var trunc = Math.trunc || function(v2) {
        return v2 > 0 ? Math.floor(v2) : Math.ceil(v2);
      };
      Point.prototype = {
        // @method clone(): Point
        // Returns a copy of the current point.
        clone: function() {
          return new Point(this.x, this.y);
        },
        // @method add(otherPoint: Point): Point
        // Returns the result of addition of the current and the given points.
        add: function(point) {
          return this.clone()._add(toPoint(point));
        },
        _add: function(point) {
          this.x += point.x;
          this.y += point.y;
          return this;
        },
        // @method subtract(otherPoint: Point): Point
        // Returns the result of subtraction of the given point from the current.
        subtract: function(point) {
          return this.clone()._subtract(toPoint(point));
        },
        _subtract: function(point) {
          this.x -= point.x;
          this.y -= point.y;
          return this;
        },
        // @method divideBy(num: Number): Point
        // Returns the result of division of the current point by the given number.
        divideBy: function(num) {
          return this.clone()._divideBy(num);
        },
        _divideBy: function(num) {
          this.x /= num;
          this.y /= num;
          return this;
        },
        // @method multiplyBy(num: Number): Point
        // Returns the result of multiplication of the current point by the given number.
        multiplyBy: function(num) {
          return this.clone()._multiplyBy(num);
        },
        _multiplyBy: function(num) {
          this.x *= num;
          this.y *= num;
          return this;
        },
        // @method scaleBy(scale: Point): Point
        // Multiply each coordinate of the current point by each coordinate of
        // `scale`. In linear algebra terms, multiply the point by the
        // [scaling matrix](https://en.wikipedia.org/wiki/Scaling_%28geometry%29#Matrix_representation)
        // defined by `scale`.
        scaleBy: function(point) {
          return new Point(this.x * point.x, this.y * point.y);
        },
        // @method unscaleBy(scale: Point): Point
        // Inverse of `scaleBy`. Divide each coordinate of the current point by
        // each coordinate of `scale`.
        unscaleBy: function(point) {
          return new Point(this.x / point.x, this.y / point.y);
        },
        // @method round(): Point
        // Returns a copy of the current point with rounded coordinates.
        round: function() {
          return this.clone()._round();
        },
        _round: function() {
          this.x = Math.round(this.x);
          this.y = Math.round(this.y);
          return this;
        },
        // @method floor(): Point
        // Returns a copy of the current point with floored coordinates (rounded down).
        floor: function() {
          return this.clone()._floor();
        },
        _floor: function() {
          this.x = Math.floor(this.x);
          this.y = Math.floor(this.y);
          return this;
        },
        // @method ceil(): Point
        // Returns a copy of the current point with ceiled coordinates (rounded up).
        ceil: function() {
          return this.clone()._ceil();
        },
        _ceil: function() {
          this.x = Math.ceil(this.x);
          this.y = Math.ceil(this.y);
          return this;
        },
        // @method trunc(): Point
        // Returns a copy of the current point with truncated coordinates (rounded towards zero).
        trunc: function() {
          return this.clone()._trunc();
        },
        _trunc: function() {
          this.x = trunc(this.x);
          this.y = trunc(this.y);
          return this;
        },
        // @method distanceTo(otherPoint: Point): Number
        // Returns the cartesian distance between the current and the given points.
        distanceTo: function(point) {
          point = toPoint(point);
          var x2 = point.x - this.x, y2 = point.y - this.y;
          return Math.sqrt(x2 * x2 + y2 * y2);
        },
        // @method equals(otherPoint: Point): Boolean
        // Returns `true` if the given point has the same coordinates.
        equals: function(point) {
          point = toPoint(point);
          return point.x === this.x && point.y === this.y;
        },
        // @method contains(otherPoint: Point): Boolean
        // Returns `true` if both coordinates of the given point are less than the corresponding current point coordinates (in absolute values).
        contains: function(point) {
          point = toPoint(point);
          return Math.abs(point.x) <= Math.abs(this.x) && Math.abs(point.y) <= Math.abs(this.y);
        },
        // @method toString(): String
        // Returns a string representation of the point for debugging purposes.
        toString: function() {
          return "Point(" + formatNum(this.x) + ", " + formatNum(this.y) + ")";
        }
      };
      function toPoint(x2, y2, round) {
        if (x2 instanceof Point) {
          return x2;
        }
        if (isArray(x2)) {
          return new Point(x2[0], x2[1]);
        }
        if (x2 === void 0 || x2 === null) {
          return x2;
        }
        if (typeof x2 === "object" && "x" in x2 && "y" in x2) {
          return new Point(x2.x, x2.y);
        }
        return new Point(x2, y2, round);
      }
      function Bounds(a2, b2) {
        if (!a2) {
          return;
        }
        var points = b2 ? [a2, b2] : a2;
        for (var i2 = 0, len = points.length; i2 < len; i2++) {
          this.extend(points[i2]);
        }
      }
      Bounds.prototype = {
        // @method extend(point: Point): this
        // Extends the bounds to contain the given point.
        // @alternative
        // @method extend(otherBounds: Bounds): this
        // Extend the bounds to contain the given bounds
        extend: function(obj) {
          var min2, max2;
          if (!obj) {
            return this;
          }
          if (obj instanceof Point || typeof obj[0] === "number" || "x" in obj) {
            min2 = max2 = toPoint(obj);
          } else {
            obj = toBounds(obj);
            min2 = obj.min;
            max2 = obj.max;
            if (!min2 || !max2) {
              return this;
            }
          }
          if (!this.min && !this.max) {
            this.min = min2.clone();
            this.max = max2.clone();
          } else {
            this.min.x = Math.min(min2.x, this.min.x);
            this.max.x = Math.max(max2.x, this.max.x);
            this.min.y = Math.min(min2.y, this.min.y);
            this.max.y = Math.max(max2.y, this.max.y);
          }
          return this;
        },
        // @method getCenter(round?: Boolean): Point
        // Returns the center point of the bounds.
        getCenter: function(round) {
          return toPoint(
            (this.min.x + this.max.x) / 2,
            (this.min.y + this.max.y) / 2,
            round
          );
        },
        // @method getBottomLeft(): Point
        // Returns the bottom-left point of the bounds.
        getBottomLeft: function() {
          return toPoint(this.min.x, this.max.y);
        },
        // @method getTopRight(): Point
        // Returns the top-right point of the bounds.
        getTopRight: function() {
          return toPoint(this.max.x, this.min.y);
        },
        // @method getTopLeft(): Point
        // Returns the top-left point of the bounds (i.e. [`this.min`](#bounds-min)).
        getTopLeft: function() {
          return this.min;
        },
        // @method getBottomRight(): Point
        // Returns the bottom-right point of the bounds (i.e. [`this.max`](#bounds-max)).
        getBottomRight: function() {
          return this.max;
        },
        // @method getSize(): Point
        // Returns the size of the given bounds
        getSize: function() {
          return this.max.subtract(this.min);
        },
        // @method contains(otherBounds: Bounds): Boolean
        // Returns `true` if the rectangle contains the given one.
        // @alternative
        // @method contains(point: Point): Boolean
        // Returns `true` if the rectangle contains the given point.
        contains: function(obj) {
          var min, max;
          if (typeof obj[0] === "number" || obj instanceof Point) {
            obj = toPoint(obj);
          } else {
            obj = toBounds(obj);
          }
          if (obj instanceof Bounds) {
            min = obj.min;
            max = obj.max;
          } else {
            min = max = obj;
          }
          return min.x >= this.min.x && max.x <= this.max.x && min.y >= this.min.y && max.y <= this.max.y;
        },
        // @method intersects(otherBounds: Bounds): Boolean
        // Returns `true` if the rectangle intersects the given bounds. Two bounds
        // intersect if they have at least one point in common.
        intersects: function(bounds) {
          bounds = toBounds(bounds);
          var min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max, xIntersects = max2.x >= min.x && min2.x <= max.x, yIntersects = max2.y >= min.y && min2.y <= max.y;
          return xIntersects && yIntersects;
        },
        // @method overlaps(otherBounds: Bounds): Boolean
        // Returns `true` if the rectangle overlaps the given bounds. Two bounds
        // overlap if their intersection is an area.
        overlaps: function(bounds) {
          bounds = toBounds(bounds);
          var min = this.min, max = this.max, min2 = bounds.min, max2 = bounds.max, xOverlaps = max2.x > min.x && min2.x < max.x, yOverlaps = max2.y > min.y && min2.y < max.y;
          return xOverlaps && yOverlaps;
        },
        // @method isValid(): Boolean
        // Returns `true` if the bounds are properly initialized.
        isValid: function() {
          return !!(this.min && this.max);
        },
        // @method pad(bufferRatio: Number): Bounds
        // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
        // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
        // Negative values will retract the bounds.
        pad: function(bufferRatio) {
          var min = this.min, max = this.max, heightBuffer = Math.abs(min.x - max.x) * bufferRatio, widthBuffer = Math.abs(min.y - max.y) * bufferRatio;
          return toBounds(
            toPoint(min.x - heightBuffer, min.y - widthBuffer),
            toPoint(max.x + heightBuffer, max.y + widthBuffer)
          );
        },
        // @method equals(otherBounds: Bounds): Boolean
        // Returns `true` if the rectangle is equivalent to the given bounds.
        equals: function(bounds) {
          if (!bounds) {
            return false;
          }
          bounds = toBounds(bounds);
          return this.min.equals(bounds.getTopLeft()) && this.max.equals(bounds.getBottomRight());
        }
      };
      function toBounds(a2, b2) {
        if (!a2 || a2 instanceof Bounds) {
          return a2;
        }
        return new Bounds(a2, b2);
      }
      function LatLngBounds(corner1, corner2) {
        if (!corner1) {
          return;
        }
        var latlngs = corner2 ? [corner1, corner2] : corner1;
        for (var i2 = 0, len = latlngs.length; i2 < len; i2++) {
          this.extend(latlngs[i2]);
        }
      }
      LatLngBounds.prototype = {
        // @method extend(latlng: LatLng): this
        // Extend the bounds to contain the given point
        // @alternative
        // @method extend(otherBounds: LatLngBounds): this
        // Extend the bounds to contain the given bounds
        extend: function(obj) {
          var sw = this._southWest, ne2 = this._northEast, sw2, ne22;
          if (obj instanceof LatLng) {
            sw2 = obj;
            ne22 = obj;
          } else if (obj instanceof LatLngBounds) {
            sw2 = obj._southWest;
            ne22 = obj._northEast;
            if (!sw2 || !ne22) {
              return this;
            }
          } else {
            return obj ? this.extend(toLatLng(obj) || toLatLngBounds(obj)) : this;
          }
          if (!sw && !ne2) {
            this._southWest = new LatLng(sw2.lat, sw2.lng);
            this._northEast = new LatLng(ne22.lat, ne22.lng);
          } else {
            sw.lat = Math.min(sw2.lat, sw.lat);
            sw.lng = Math.min(sw2.lng, sw.lng);
            ne2.lat = Math.max(ne22.lat, ne2.lat);
            ne2.lng = Math.max(ne22.lng, ne2.lng);
          }
          return this;
        },
        // @method pad(bufferRatio: Number): LatLngBounds
        // Returns bounds created by extending or retracting the current bounds by a given ratio in each direction.
        // For example, a ratio of 0.5 extends the bounds by 50% in each direction.
        // Negative values will retract the bounds.
        pad: function(bufferRatio) {
          var sw = this._southWest, ne2 = this._northEast, heightBuffer = Math.abs(sw.lat - ne2.lat) * bufferRatio, widthBuffer = Math.abs(sw.lng - ne2.lng) * bufferRatio;
          return new LatLngBounds(
            new LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
            new LatLng(ne2.lat + heightBuffer, ne2.lng + widthBuffer)
          );
        },
        // @method getCenter(): LatLng
        // Returns the center point of the bounds.
        getCenter: function() {
          return new LatLng(
            (this._southWest.lat + this._northEast.lat) / 2,
            (this._southWest.lng + this._northEast.lng) / 2
          );
        },
        // @method getSouthWest(): LatLng
        // Returns the south-west point of the bounds.
        getSouthWest: function() {
          return this._southWest;
        },
        // @method getNorthEast(): LatLng
        // Returns the north-east point of the bounds.
        getNorthEast: function() {
          return this._northEast;
        },
        // @method getNorthWest(): LatLng
        // Returns the north-west point of the bounds.
        getNorthWest: function() {
          return new LatLng(this.getNorth(), this.getWest());
        },
        // @method getSouthEast(): LatLng
        // Returns the south-east point of the bounds.
        getSouthEast: function() {
          return new LatLng(this.getSouth(), this.getEast());
        },
        // @method getWest(): Number
        // Returns the west longitude of the bounds
        getWest: function() {
          return this._southWest.lng;
        },
        // @method getSouth(): Number
        // Returns the south latitude of the bounds
        getSouth: function() {
          return this._southWest.lat;
        },
        // @method getEast(): Number
        // Returns the east longitude of the bounds
        getEast: function() {
          return this._northEast.lng;
        },
        // @method getNorth(): Number
        // Returns the north latitude of the bounds
        getNorth: function() {
          return this._northEast.lat;
        },
        // @method contains(otherBounds: LatLngBounds): Boolean
        // Returns `true` if the rectangle contains the given one.
        // @alternative
        // @method contains (latlng: LatLng): Boolean
        // Returns `true` if the rectangle contains the given point.
        contains: function(obj) {
          if (typeof obj[0] === "number" || obj instanceof LatLng || "lat" in obj) {
            obj = toLatLng(obj);
          } else {
            obj = toLatLngBounds(obj);
          }
          var sw = this._southWest, ne2 = this._northEast, sw2, ne22;
          if (obj instanceof LatLngBounds) {
            sw2 = obj.getSouthWest();
            ne22 = obj.getNorthEast();
          } else {
            sw2 = ne22 = obj;
          }
          return sw2.lat >= sw.lat && ne22.lat <= ne2.lat && sw2.lng >= sw.lng && ne22.lng <= ne2.lng;
        },
        // @method intersects(otherBounds: LatLngBounds): Boolean
        // Returns `true` if the rectangle intersects the given bounds. Two bounds intersect if they have at least one point in common.
        intersects: function(bounds) {
          bounds = toLatLngBounds(bounds);
          var sw = this._southWest, ne2 = this._northEast, sw2 = bounds.getSouthWest(), ne22 = bounds.getNorthEast(), latIntersects = ne22.lat >= sw.lat && sw2.lat <= ne2.lat, lngIntersects = ne22.lng >= sw.lng && sw2.lng <= ne2.lng;
          return latIntersects && lngIntersects;
        },
        // @method overlaps(otherBounds: LatLngBounds): Boolean
        // Returns `true` if the rectangle overlaps the given bounds. Two bounds overlap if their intersection is an area.
        overlaps: function(bounds) {
          bounds = toLatLngBounds(bounds);
          var sw = this._southWest, ne2 = this._northEast, sw2 = bounds.getSouthWest(), ne22 = bounds.getNorthEast(), latOverlaps = ne22.lat > sw.lat && sw2.lat < ne2.lat, lngOverlaps = ne22.lng > sw.lng && sw2.lng < ne2.lng;
          return latOverlaps && lngOverlaps;
        },
        // @method toBBoxString(): String
        // Returns a string with bounding box coordinates in a 'southwest_lng,southwest_lat,northeast_lng,northeast_lat' format. Useful for sending requests to web services that return geo data.
        toBBoxString: function() {
          return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(",");
        },
        // @method equals(otherBounds: LatLngBounds, maxMargin?: Number): Boolean
        // Returns `true` if the rectangle is equivalent (within a small margin of error) to the given bounds. The margin of error can be overridden by setting `maxMargin` to a small number.
        equals: function(bounds, maxMargin) {
          if (!bounds) {
            return false;
          }
          bounds = toLatLngBounds(bounds);
          return this._southWest.equals(bounds.getSouthWest(), maxMargin) && this._northEast.equals(bounds.getNorthEast(), maxMargin);
        },
        // @method isValid(): Boolean
        // Returns `true` if the bounds are properly initialized.
        isValid: function() {
          return !!(this._southWest && this._northEast);
        }
      };
      function toLatLngBounds(a2, b2) {
        if (a2 instanceof LatLngBounds) {
          return a2;
        }
        return new LatLngBounds(a2, b2);
      }
      function LatLng(lat, lng, alt) {
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error("Invalid LatLng object: (" + lat + ", " + lng + ")");
        }
        this.lat = +lat;
        this.lng = +lng;
        if (alt !== void 0) {
          this.alt = +alt;
        }
      }
      LatLng.prototype = {
        // @method equals(otherLatLng: LatLng, maxMargin?: Number): Boolean
        // Returns `true` if the given `LatLng` point is at the same position (within a small margin of error). The margin of error can be overridden by setting `maxMargin` to a small number.
        equals: function(obj, maxMargin) {
          if (!obj) {
            return false;
          }
          obj = toLatLng(obj);
          var margin = Math.max(
            Math.abs(this.lat - obj.lat),
            Math.abs(this.lng - obj.lng)
          );
          return margin <= (maxMargin === void 0 ? 1e-9 : maxMargin);
        },
        // @method toString(): String
        // Returns a string representation of the point (for debugging purposes).
        toString: function(precision) {
          return "LatLng(" + formatNum(this.lat, precision) + ", " + formatNum(this.lng, precision) + ")";
        },
        // @method distanceTo(otherLatLng: LatLng): Number
        // Returns the distance (in meters) to the given `LatLng` calculated using the [Spherical Law of Cosines](https://en.wikipedia.org/wiki/Spherical_law_of_cosines).
        distanceTo: function(other) {
          return Earth.distance(this, toLatLng(other));
        },
        // @method wrap(): LatLng
        // Returns a new `LatLng` object with the longitude wrapped so it's always between -180 and +180 degrees.
        wrap: function() {
          return Earth.wrapLatLng(this);
        },
        // @method toBounds(sizeInMeters: Number): LatLngBounds
        // Returns a new `LatLngBounds` object in which each boundary is `sizeInMeters/2` meters apart from the `LatLng`.
        toBounds: function(sizeInMeters) {
          var latAccuracy = 180 * sizeInMeters / 40075017, lngAccuracy = latAccuracy / Math.cos(Math.PI / 180 * this.lat);
          return toLatLngBounds(
            [this.lat - latAccuracy, this.lng - lngAccuracy],
            [this.lat + latAccuracy, this.lng + lngAccuracy]
          );
        },
        clone: function() {
          return new LatLng(this.lat, this.lng, this.alt);
        }
      };
      function toLatLng(a2, b2, c2) {
        if (a2 instanceof LatLng) {
          return a2;
        }
        if (isArray(a2) && typeof a2[0] !== "object") {
          if (a2.length === 3) {
            return new LatLng(a2[0], a2[1], a2[2]);
          }
          if (a2.length === 2) {
            return new LatLng(a2[0], a2[1]);
          }
          return null;
        }
        if (a2 === void 0 || a2 === null) {
          return a2;
        }
        if (typeof a2 === "object" && "lat" in a2) {
          return new LatLng(a2.lat, "lng" in a2 ? a2.lng : a2.lon, a2.alt);
        }
        if (b2 === void 0) {
          return null;
        }
        return new LatLng(a2, b2, c2);
      }
      var CRS = {
        // @method latLngToPoint(latlng: LatLng, zoom: Number): Point
        // Projects geographical coordinates into pixel coordinates for a given zoom.
        latLngToPoint: function(latlng, zoom2) {
          var projectedPoint = this.projection.project(latlng), scale2 = this.scale(zoom2);
          return this.transformation._transform(projectedPoint, scale2);
        },
        // @method pointToLatLng(point: Point, zoom: Number): LatLng
        // The inverse of `latLngToPoint`. Projects pixel coordinates on a given
        // zoom into geographical coordinates.
        pointToLatLng: function(point, zoom2) {
          var scale2 = this.scale(zoom2), untransformedPoint = this.transformation.untransform(point, scale2);
          return this.projection.unproject(untransformedPoint);
        },
        // @method project(latlng: LatLng): Point
        // Projects geographical coordinates into coordinates in units accepted for
        // this CRS (e.g. meters for EPSG:3857, for passing it to WMS services).
        project: function(latlng) {
          return this.projection.project(latlng);
        },
        // @method unproject(point: Point): LatLng
        // Given a projected coordinate returns the corresponding LatLng.
        // The inverse of `project`.
        unproject: function(point) {
          return this.projection.unproject(point);
        },
        // @method scale(zoom: Number): Number
        // Returns the scale used when transforming projected coordinates into
        // pixel coordinates for a particular zoom. For example, it returns
        // `256 * 2^zoom` for Mercator-based CRS.
        scale: function(zoom2) {
          return 256 * Math.pow(2, zoom2);
        },
        // @method zoom(scale: Number): Number
        // Inverse of `scale()`, returns the zoom level corresponding to a scale
        // factor of `scale`.
        zoom: function(scale2) {
          return Math.log(scale2 / 256) / Math.LN2;
        },
        // @method getProjectedBounds(zoom: Number): Bounds
        // Returns the projection's bounds scaled and transformed for the provided `zoom`.
        getProjectedBounds: function(zoom2) {
          if (this.infinite) {
            return null;
          }
          var b2 = this.projection.bounds, s2 = this.scale(zoom2), min = this.transformation.transform(b2.min, s2), max = this.transformation.transform(b2.max, s2);
          return new Bounds(min, max);
        },
        // @method distance(latlng1: LatLng, latlng2: LatLng): Number
        // Returns the distance between two geographical coordinates.
        // @property code: String
        // Standard code name of the CRS passed into WMS services (e.g. `'EPSG:3857'`)
        //
        // @property wrapLng: Number[]
        // An array of two numbers defining whether the longitude (horizontal) coordinate
        // axis wraps around a given range and how. Defaults to `[-180, 180]` in most
        // geographical CRSs. If `undefined`, the longitude axis does not wrap around.
        //
        // @property wrapLat: Number[]
        // Like `wrapLng`, but for the latitude (vertical) axis.
        // wrapLng: [min, max],
        // wrapLat: [min, max],
        // @property infinite: Boolean
        // If true, the coordinate space will be unbounded (infinite in both axes)
        infinite: false,
        // @method wrapLatLng(latlng: LatLng): LatLng
        // Returns a `LatLng` where lat and lng has been wrapped according to the
        // CRS's `wrapLat` and `wrapLng` properties, if they are outside the CRS's bounds.
        wrapLatLng: function(latlng) {
          var lng = this.wrapLng ? wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng, lat = this.wrapLat ? wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat, alt = latlng.alt;
          return new LatLng(lat, lng, alt);
        },
        // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
        // Returns a `LatLngBounds` with the same size as the given one, ensuring
        // that its center is within the CRS's bounds.
        // Only accepts actual `L.LatLngBounds` instances, not arrays.
        wrapLatLngBounds: function(bounds) {
          var center = bounds.getCenter(), newCenter = this.wrapLatLng(center), latShift = center.lat - newCenter.lat, lngShift = center.lng - newCenter.lng;
          if (latShift === 0 && lngShift === 0) {
            return bounds;
          }
          var sw = bounds.getSouthWest(), ne2 = bounds.getNorthEast(), newSw = new LatLng(sw.lat - latShift, sw.lng - lngShift), newNe = new LatLng(ne2.lat - latShift, ne2.lng - lngShift);
          return new LatLngBounds(newSw, newNe);
        }
      };
      var Earth = extend({}, CRS, {
        wrapLng: [-180, 180],
        // Mean Earth Radius, as recommended for use by
        // the International Union of Geodesy and Geophysics,
        // see https://rosettacode.org/wiki/Haversine_formula
        R: 6371e3,
        // distance between two geographical points using spherical law of cosines approximation
        distance: function(latlng1, latlng2) {
          var rad = Math.PI / 180, lat1 = latlng1.lat * rad, lat2 = latlng2.lat * rad, sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2), sinDLon = Math.sin((latlng2.lng - latlng1.lng) * rad / 2), a2 = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon, c2 = 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
          return this.R * c2;
        }
      });
      var earthRadius = 6378137;
      var SphericalMercator = {
        R: earthRadius,
        MAX_LATITUDE: 85.0511287798,
        project: function(latlng) {
          var d2 = Math.PI / 180, max = this.MAX_LATITUDE, lat = Math.max(Math.min(max, latlng.lat), -max), sin = Math.sin(lat * d2);
          return new Point(
            this.R * latlng.lng * d2,
            this.R * Math.log((1 + sin) / (1 - sin)) / 2
          );
        },
        unproject: function(point) {
          var d2 = 180 / Math.PI;
          return new LatLng(
            (2 * Math.atan(Math.exp(point.y / this.R)) - Math.PI / 2) * d2,
            point.x * d2 / this.R
          );
        },
        bounds: function() {
          var d2 = earthRadius * Math.PI;
          return new Bounds([-d2, -d2], [d2, d2]);
        }()
      };
      function Transformation(a2, b2, c2, d2) {
        if (isArray(a2)) {
          this._a = a2[0];
          this._b = a2[1];
          this._c = a2[2];
          this._d = a2[3];
          return;
        }
        this._a = a2;
        this._b = b2;
        this._c = c2;
        this._d = d2;
      }
      Transformation.prototype = {
        // @method transform(point: Point, scale?: Number): Point
        // Returns a transformed point, optionally multiplied by the given scale.
        // Only accepts actual `L.Point` instances, not arrays.
        transform: function(point, scale2) {
          return this._transform(point.clone(), scale2);
        },
        // destructive transform (faster)
        _transform: function(point, scale2) {
          scale2 = scale2 || 1;
          point.x = scale2 * (this._a * point.x + this._b);
          point.y = scale2 * (this._c * point.y + this._d);
          return point;
        },
        // @method untransform(point: Point, scale?: Number): Point
        // Returns the reverse transformation of the given point, optionally divided
        // by the given scale. Only accepts actual `L.Point` instances, not arrays.
        untransform: function(point, scale2) {
          scale2 = scale2 || 1;
          return new Point(
            (point.x / scale2 - this._b) / this._a,
            (point.y / scale2 - this._d) / this._c
          );
        }
      };
      function toTransformation(a2, b2, c2, d2) {
        return new Transformation(a2, b2, c2, d2);
      }
      var EPSG3857 = extend({}, Earth, {
        code: "EPSG:3857",
        projection: SphericalMercator,
        transformation: function() {
          var scale2 = 0.5 / (Math.PI * SphericalMercator.R);
          return toTransformation(scale2, 0.5, -scale2, 0.5);
        }()
      });
      var EPSG900913 = extend({}, EPSG3857, {
        code: "EPSG:900913"
      });
      function svgCreate(name) {
        return document.createElementNS("http://www.w3.org/2000/svg", name);
      }
      function pointsToPath(rings, closed) {
        var str = "", i2, j2, len, len2, points, p2;
        for (i2 = 0, len = rings.length; i2 < len; i2++) {
          points = rings[i2];
          for (j2 = 0, len2 = points.length; j2 < len2; j2++) {
            p2 = points[j2];
            str += (j2 ? "L" : "M") + p2.x + " " + p2.y;
          }
          str += closed ? Browser.svg ? "z" : "x" : "";
        }
        return str || "M0 0";
      }
      var style = document.documentElement.style;
      var ie2 = "ActiveXObject" in window;
      var ielt9 = ie2 && !document.addEventListener;
      var edge = "msLaunchUri" in navigator && !("documentMode" in document);
      var webkit = userAgentContains("webkit");
      var android = userAgentContains("android");
      var android23 = userAgentContains("android 2") || userAgentContains("android 3");
      var webkitVer = parseInt(/WebKit\/([0-9]+)|$/.exec(navigator.userAgent)[1], 10);
      var androidStock = android && userAgentContains("Google") && webkitVer < 537 && !("AudioNode" in window);
      var opera = !!window.opera;
      var chrome = !edge && userAgentContains("chrome");
      var gecko = userAgentContains("gecko") && !webkit && !opera && !ie2;
      var safari = !chrome && userAgentContains("safari");
      var phantom = userAgentContains("phantom");
      var opera12 = "OTransition" in style;
      var win = navigator.platform.indexOf("Win") === 0;
      var ie3d = ie2 && "transition" in style;
      var webkit3d = "WebKitCSSMatrix" in window && "m11" in new window.WebKitCSSMatrix() && !android23;
      var gecko3d = "MozPerspective" in style;
      var any3d = !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d) && !opera12 && !phantom;
      var mobile = typeof orientation !== "undefined" || userAgentContains("mobile");
      var mobileWebkit = mobile && webkit;
      var mobileWebkit3d = mobile && webkit3d;
      var msPointer = !window.PointerEvent && window.MSPointerEvent;
      var pointer = !!(window.PointerEvent || msPointer);
      var touchNative = "ontouchstart" in window || !!window.TouchEvent;
      var touch = !window.L_NO_TOUCH && (touchNative || pointer);
      var mobileOpera = mobile && opera;
      var mobileGecko = mobile && gecko;
      var retina = (window.devicePixelRatio || window.screen.deviceXDPI / window.screen.logicalXDPI) > 1;
      var passiveEvents = function() {
        var supportsPassiveOption = false;
        try {
          var opts = Object.defineProperty({}, "passive", {
            get: function() {
              supportsPassiveOption = true;
            }
          });
          window.addEventListener("testPassiveEventSupport", falseFn, opts);
          window.removeEventListener("testPassiveEventSupport", falseFn, opts);
        } catch (e2) {
        }
        return supportsPassiveOption;
      }();
      var canvas$1 = function() {
        return !!document.createElement("canvas").getContext;
      }();
      var svg$1 = !!(document.createElementNS && svgCreate("svg").createSVGRect);
      var inlineSvg = !!svg$1 && function() {
        var div = document.createElement("div");
        div.innerHTML = "<svg/>";
        return (div.firstChild && div.firstChild.namespaceURI) === "http://www.w3.org/2000/svg";
      }();
      var vml = !svg$1 && function() {
        try {
          var div = document.createElement("div");
          div.innerHTML = '<v:shape adj="1"/>';
          var shape = div.firstChild;
          shape.style.behavior = "url(#default#VML)";
          return shape && typeof shape.adj === "object";
        } catch (e2) {
          return false;
        }
      }();
      var mac = navigator.platform.indexOf("Mac") === 0;
      var linux = navigator.platform.indexOf("Linux") === 0;
      function userAgentContains(str) {
        return navigator.userAgent.toLowerCase().indexOf(str) >= 0;
      }
      var Browser = {
        ie: ie2,
        ielt9,
        edge,
        webkit,
        android,
        android23,
        androidStock,
        opera,
        chrome,
        gecko,
        safari,
        phantom,
        opera12,
        win,
        ie3d,
        webkit3d,
        gecko3d,
        any3d,
        mobile,
        mobileWebkit,
        mobileWebkit3d,
        msPointer,
        pointer,
        touch,
        touchNative,
        mobileOpera,
        mobileGecko,
        retina,
        passiveEvents,
        canvas: canvas$1,
        svg: svg$1,
        vml,
        inlineSvg,
        mac,
        linux
      };
      var POINTER_DOWN = Browser.msPointer ? "MSPointerDown" : "pointerdown";
      var POINTER_MOVE = Browser.msPointer ? "MSPointerMove" : "pointermove";
      var POINTER_UP = Browser.msPointer ? "MSPointerUp" : "pointerup";
      var POINTER_CANCEL = Browser.msPointer ? "MSPointerCancel" : "pointercancel";
      var pEvent = {
        touchstart: POINTER_DOWN,
        touchmove: POINTER_MOVE,
        touchend: POINTER_UP,
        touchcancel: POINTER_CANCEL
      };
      var handle = {
        touchstart: _onPointerStart,
        touchmove: _handlePointer,
        touchend: _handlePointer,
        touchcancel: _handlePointer
      };
      var _pointers = {};
      var _pointerDocListener = false;
      function addPointerListener(obj, type, handler) {
        if (type === "touchstart") {
          _addPointerDocListener();
        }
        if (!handle[type]) {
          console.warn("wrong event specified:", type);
          return falseFn;
        }
        handler = handle[type].bind(this, handler);
        obj.addEventListener(pEvent[type], handler, false);
        return handler;
      }
      function removePointerListener(obj, type, handler) {
        if (!pEvent[type]) {
          console.warn("wrong event specified:", type);
          return;
        }
        obj.removeEventListener(pEvent[type], handler, false);
      }
      function _globalPointerDown(e2) {
        _pointers[e2.pointerId] = e2;
      }
      function _globalPointerMove(e2) {
        if (_pointers[e2.pointerId]) {
          _pointers[e2.pointerId] = e2;
        }
      }
      function _globalPointerUp(e2) {
        delete _pointers[e2.pointerId];
      }
      function _addPointerDocListener() {
        if (!_pointerDocListener) {
          document.addEventListener(POINTER_DOWN, _globalPointerDown, true);
          document.addEventListener(POINTER_MOVE, _globalPointerMove, true);
          document.addEventListener(POINTER_UP, _globalPointerUp, true);
          document.addEventListener(POINTER_CANCEL, _globalPointerUp, true);
          _pointerDocListener = true;
        }
      }
      function _handlePointer(handler, e2) {
        if (e2.pointerType === (e2.MSPOINTER_TYPE_MOUSE || "mouse")) {
          return;
        }
        e2.touches = [];
        for (var i2 in _pointers) {
          e2.touches.push(_pointers[i2]);
        }
        e2.changedTouches = [e2];
        handler(e2);
      }
      function _onPointerStart(handler, e2) {
        if (e2.MSPOINTER_TYPE_TOUCH && e2.pointerType === e2.MSPOINTER_TYPE_TOUCH) {
          preventDefault(e2);
        }
        _handlePointer(handler, e2);
      }
      function makeDblclick(event) {
        var newEvent = {}, prop, i2;
        for (i2 in event) {
          prop = event[i2];
          newEvent[i2] = prop && prop.bind ? prop.bind(event) : prop;
        }
        event = newEvent;
        newEvent.type = "dblclick";
        newEvent.detail = 2;
        newEvent.isTrusted = false;
        newEvent._simulated = true;
        return newEvent;
      }
      var delay = 200;
      function addDoubleTapListener(obj, handler) {
        obj.addEventListener("dblclick", handler);
        var last = 0, detail;
        function simDblclick(e2) {
          if (e2.detail !== 1) {
            detail = e2.detail;
            return;
          }
          if (e2.pointerType === "mouse" || e2.sourceCapabilities && !e2.sourceCapabilities.firesTouchEvents) {
            return;
          }
          var path = getPropagationPath(e2);
          if (path.some(function(el) {
            return el instanceof HTMLLabelElement && el.attributes.for;
          }) && !path.some(function(el) {
            return el instanceof HTMLInputElement || el instanceof HTMLSelectElement;
          })) {
            return;
          }
          var now = Date.now();
          if (now - last <= delay) {
            detail++;
            if (detail === 2) {
              handler(makeDblclick(e2));
            }
          } else {
            detail = 1;
          }
          last = now;
        }
        obj.addEventListener("click", simDblclick);
        return {
          dblclick: handler,
          simDblclick
        };
      }
      function removeDoubleTapListener(obj, handlers) {
        obj.removeEventListener("dblclick", handlers.dblclick);
        obj.removeEventListener("click", handlers.simDblclick);
      }
      var TRANSFORM = testProp(
        ["transform", "webkitTransform", "OTransform", "MozTransform", "msTransform"]
      );
      var TRANSITION = testProp(
        ["webkitTransition", "transition", "OTransition", "MozTransition", "msTransition"]
      );
      var TRANSITION_END = TRANSITION === "webkitTransition" || TRANSITION === "OTransition" ? TRANSITION + "End" : "transitionend";
      function get(id) {
        return typeof id === "string" ? document.getElementById(id) : id;
      }
      function getStyle(el, style2) {
        var value = el.style[style2] || el.currentStyle && el.currentStyle[style2];
        if ((!value || value === "auto") && document.defaultView) {
          var css = document.defaultView.getComputedStyle(el, null);
          value = css ? css[style2] : null;
        }
        return value === "auto" ? null : value;
      }
      function create$1(tagName, className, container) {
        var el = document.createElement(tagName);
        el.className = className || "";
        if (container) {
          container.appendChild(el);
        }
        return el;
      }
      function remove(el) {
        var parent = el.parentNode;
        if (parent) {
          parent.removeChild(el);
        }
      }
      function empty(el) {
        while (el.firstChild) {
          el.removeChild(el.firstChild);
        }
      }
      function toFront(el) {
        var parent = el.parentNode;
        if (parent && parent.lastChild !== el) {
          parent.appendChild(el);
        }
      }
      function toBack(el) {
        var parent = el.parentNode;
        if (parent && parent.firstChild !== el) {
          parent.insertBefore(el, parent.firstChild);
        }
      }
      function hasClass(el, name) {
        if (el.classList !== void 0) {
          return el.classList.contains(name);
        }
        var className = getClass(el);
        return className.length > 0 && new RegExp("(^|\\s)" + name + "(\\s|$)").test(className);
      }
      function addClass(el, name) {
        if (el.classList !== void 0) {
          var classes = splitWords(name);
          for (var i2 = 0, len = classes.length; i2 < len; i2++) {
            el.classList.add(classes[i2]);
          }
        } else if (!hasClass(el, name)) {
          var className = getClass(el);
          setClass(el, (className ? className + " " : "") + name);
        }
      }
      function removeClass(el, name) {
        if (el.classList !== void 0) {
          el.classList.remove(name);
        } else {
          setClass(el, trim((" " + getClass(el) + " ").replace(" " + name + " ", " ")));
        }
      }
      function setClass(el, name) {
        if (el.className.baseVal === void 0) {
          el.className = name;
        } else {
          el.className.baseVal = name;
        }
      }
      function getClass(el) {
        if (el.correspondingElement) {
          el = el.correspondingElement;
        }
        return el.className.baseVal === void 0 ? el.className : el.className.baseVal;
      }
      function setOpacity(el, value) {
        if ("opacity" in el.style) {
          el.style.opacity = value;
        } else if ("filter" in el.style) {
          _setOpacityIE(el, value);
        }
      }
      function _setOpacityIE(el, value) {
        var filter = false, filterName = "DXImageTransform.Microsoft.Alpha";
        try {
          filter = el.filters.item(filterName);
        } catch (e2) {
          if (value === 1) {
            return;
          }
        }
        value = Math.round(value * 100);
        if (filter) {
          filter.Enabled = value !== 100;
          filter.Opacity = value;
        } else {
          el.style.filter += " progid:" + filterName + "(opacity=" + value + ")";
        }
      }
      function testProp(props) {
        var style2 = document.documentElement.style;
        for (var i2 = 0; i2 < props.length; i2++) {
          if (props[i2] in style2) {
            return props[i2];
          }
        }
        return false;
      }
      function setTransform(el, offset, scale2) {
        var pos = offset || new Point(0, 0);
        el.style[TRANSFORM] = (Browser.ie3d ? "translate(" + pos.x + "px," + pos.y + "px)" : "translate3d(" + pos.x + "px," + pos.y + "px,0)") + (scale2 ? " scale(" + scale2 + ")" : "");
      }
      function setPosition(el, point) {
        el._leaflet_pos = point;
        if (Browser.any3d) {
          setTransform(el, point);
        } else {
          el.style.left = point.x + "px";
          el.style.top = point.y + "px";
        }
      }
      function getPosition(el) {
        return el._leaflet_pos || new Point(0, 0);
      }
      var disableTextSelection;
      var enableTextSelection;
      var _userSelect;
      if ("onselectstart" in document) {
        disableTextSelection = function() {
          on(window, "selectstart", preventDefault);
        };
        enableTextSelection = function() {
          off(window, "selectstart", preventDefault);
        };
      } else {
        var userSelectProperty = testProp(
          ["userSelect", "WebkitUserSelect", "OUserSelect", "MozUserSelect", "msUserSelect"]
        );
        disableTextSelection = function() {
          if (userSelectProperty) {
            var style2 = document.documentElement.style;
            _userSelect = style2[userSelectProperty];
            style2[userSelectProperty] = "none";
          }
        };
        enableTextSelection = function() {
          if (userSelectProperty) {
            document.documentElement.style[userSelectProperty] = _userSelect;
            _userSelect = void 0;
          }
        };
      }
      function disableImageDrag() {
        on(window, "dragstart", preventDefault);
      }
      function enableImageDrag() {
        off(window, "dragstart", preventDefault);
      }
      var _outlineElement, _outlineStyle;
      function preventOutline(element) {
        while (element.tabIndex === -1) {
          element = element.parentNode;
        }
        if (!element.style) {
          return;
        }
        restoreOutline();
        _outlineElement = element;
        _outlineStyle = element.style.outlineStyle;
        element.style.outlineStyle = "none";
        on(window, "keydown", restoreOutline);
      }
      function restoreOutline() {
        if (!_outlineElement) {
          return;
        }
        _outlineElement.style.outlineStyle = _outlineStyle;
        _outlineElement = void 0;
        _outlineStyle = void 0;
        off(window, "keydown", restoreOutline);
      }
      function getSizedParentNode(element) {
        do {
          element = element.parentNode;
        } while ((!element.offsetWidth || !element.offsetHeight) && element !== document.body);
        return element;
      }
      function getScale(element) {
        var rect = element.getBoundingClientRect();
        return {
          x: rect.width / element.offsetWidth || 1,
          y: rect.height / element.offsetHeight || 1,
          boundingClientRect: rect
        };
      }
      var DomUtil = {
        __proto__: null,
        TRANSFORM,
        TRANSITION,
        TRANSITION_END,
        get,
        getStyle,
        create: create$1,
        remove,
        empty,
        toFront,
        toBack,
        hasClass,
        addClass,
        removeClass,
        setClass,
        getClass,
        setOpacity,
        testProp,
        setTransform,
        setPosition,
        getPosition,
        get disableTextSelection() {
          return disableTextSelection;
        },
        get enableTextSelection() {
          return enableTextSelection;
        },
        disableImageDrag,
        enableImageDrag,
        preventOutline,
        restoreOutline,
        getSizedParentNode,
        getScale
      };
      function on(obj, types, fn, context) {
        if (types && typeof types === "object") {
          for (var type in types) {
            addOne(obj, type, types[type], fn);
          }
        } else {
          types = splitWords(types);
          for (var i2 = 0, len = types.length; i2 < len; i2++) {
            addOne(obj, types[i2], fn, context);
          }
        }
        return this;
      }
      var eventsKey = "_leaflet_events";
      function off(obj, types, fn, context) {
        if (arguments.length === 1) {
          batchRemove(obj);
          delete obj[eventsKey];
        } else if (types && typeof types === "object") {
          for (var type in types) {
            removeOne(obj, type, types[type], fn);
          }
        } else {
          types = splitWords(types);
          if (arguments.length === 2) {
            batchRemove(obj, function(type2) {
              return indexOf(types, type2) !== -1;
            });
          } else {
            for (var i2 = 0, len = types.length; i2 < len; i2++) {
              removeOne(obj, types[i2], fn, context);
            }
          }
        }
        return this;
      }
      function batchRemove(obj, filterFn) {
        for (var id in obj[eventsKey]) {
          var type = id.split(/\d/)[0];
          if (!filterFn || filterFn(type)) {
            removeOne(obj, type, null, null, id);
          }
        }
      }
      var mouseSubst = {
        mouseenter: "mouseover",
        mouseleave: "mouseout",
        wheel: !("onwheel" in window) && "mousewheel"
      };
      function addOne(obj, type, fn, context) {
        var id = type + stamp(fn) + (context ? "_" + stamp(context) : "");
        if (obj[eventsKey] && obj[eventsKey][id]) {
          return this;
        }
        var handler = function(e2) {
          return fn.call(context || obj, e2 || window.event);
        };
        var originalHandler = handler;
        if (!Browser.touchNative && Browser.pointer && type.indexOf("touch") === 0) {
          handler = addPointerListener(obj, type, handler);
        } else if (Browser.touch && type === "dblclick") {
          handler = addDoubleTapListener(obj, handler);
        } else if ("addEventListener" in obj) {
          if (type === "touchstart" || type === "touchmove" || type === "wheel" || type === "mousewheel") {
            obj.addEventListener(mouseSubst[type] || type, handler, Browser.passiveEvents ? { passive: false } : false);
          } else if (type === "mouseenter" || type === "mouseleave") {
            handler = function(e2) {
              e2 = e2 || window.event;
              if (isExternalTarget(obj, e2)) {
                originalHandler(e2);
              }
            };
            obj.addEventListener(mouseSubst[type], handler, false);
          } else {
            obj.addEventListener(type, originalHandler, false);
          }
        } else {
          obj.attachEvent("on" + type, handler);
        }
        obj[eventsKey] = obj[eventsKey] || {};
        obj[eventsKey][id] = handler;
      }
      function removeOne(obj, type, fn, context, id) {
        id = id || type + stamp(fn) + (context ? "_" + stamp(context) : "");
        var handler = obj[eventsKey] && obj[eventsKey][id];
        if (!handler) {
          return this;
        }
        if (!Browser.touchNative && Browser.pointer && type.indexOf("touch") === 0) {
          removePointerListener(obj, type, handler);
        } else if (Browser.touch && type === "dblclick") {
          removeDoubleTapListener(obj, handler);
        } else if ("removeEventListener" in obj) {
          obj.removeEventListener(mouseSubst[type] || type, handler, false);
        } else {
          obj.detachEvent("on" + type, handler);
        }
        obj[eventsKey][id] = null;
      }
      function stopPropagation(e2) {
        if (e2.stopPropagation) {
          e2.stopPropagation();
        } else if (e2.originalEvent) {
          e2.originalEvent._stopped = true;
        } else {
          e2.cancelBubble = true;
        }
        return this;
      }
      function disableScrollPropagation(el) {
        addOne(el, "wheel", stopPropagation);
        return this;
      }
      function disableClickPropagation(el) {
        on(el, "mousedown touchstart dblclick contextmenu", stopPropagation);
        el["_leaflet_disable_click"] = true;
        return this;
      }
      function preventDefault(e2) {
        if (e2.preventDefault) {
          e2.preventDefault();
        } else {
          e2.returnValue = false;
        }
        return this;
      }
      function stop(e2) {
        preventDefault(e2);
        stopPropagation(e2);
        return this;
      }
      function getPropagationPath(ev) {
        if (ev.composedPath) {
          return ev.composedPath();
        }
        var path = [];
        var el = ev.target;
        while (el) {
          path.push(el);
          el = el.parentNode;
        }
        return path;
      }
      function getMousePosition(e2, container) {
        if (!container) {
          return new Point(e2.clientX, e2.clientY);
        }
        var scale2 = getScale(container), offset = scale2.boundingClientRect;
        return new Point(
          // offset.left/top values are in page scale (like clientX/Y),
          // whereas clientLeft/Top (border width) values are the original values (before CSS scale applies).
          (e2.clientX - offset.left) / scale2.x - container.clientLeft,
          (e2.clientY - offset.top) / scale2.y - container.clientTop
        );
      }
      var wheelPxFactor = Browser.linux && Browser.chrome ? window.devicePixelRatio : Browser.mac ? window.devicePixelRatio * 3 : window.devicePixelRatio > 0 ? 2 * window.devicePixelRatio : 1;
      function getWheelDelta(e2) {
        return Browser.edge ? e2.wheelDeltaY / 2 : (
          // Don't trust window-geometry-based delta
          e2.deltaY && e2.deltaMode === 0 ? -e2.deltaY / wheelPxFactor : (
            // Pixels
            e2.deltaY && e2.deltaMode === 1 ? -e2.deltaY * 20 : (
              // Lines
              e2.deltaY && e2.deltaMode === 2 ? -e2.deltaY * 60 : (
                // Pages
                e2.deltaX || e2.deltaZ ? 0 : (
                  // Skip horizontal/depth wheel events
                  e2.wheelDelta ? (e2.wheelDeltaY || e2.wheelDelta) / 2 : (
                    // Legacy IE pixels
                    e2.detail && Math.abs(e2.detail) < 32765 ? -e2.detail * 20 : (
                      // Legacy Moz lines
                      e2.detail ? e2.detail / -32765 * 60 : (
                        // Legacy Moz pages
                        0
                      )
                    )
                  )
                )
              )
            )
          )
        );
      }
      function isExternalTarget(el, e2) {
        var related = e2.relatedTarget;
        if (!related) {
          return true;
        }
        try {
          while (related && related !== el) {
            related = related.parentNode;
          }
        } catch (err) {
          return false;
        }
        return related !== el;
      }
      var DomEvent = {
        __proto__: null,
        on,
        off,
        stopPropagation,
        disableScrollPropagation,
        disableClickPropagation,
        preventDefault,
        stop,
        getPropagationPath,
        getMousePosition,
        getWheelDelta,
        isExternalTarget,
        addListener: on,
        removeListener: off
      };
      var PosAnimation = Evented.extend({
        // @method run(el: HTMLElement, newPos: Point, duration?: Number, easeLinearity?: Number)
        // Run an animation of a given element to a new position, optionally setting
        // duration in seconds (`0.25` by default) and easing linearity factor (3rd
        // argument of the [cubic bezier curve](https://cubic-bezier.com/#0,0,.5,1),
        // `0.5` by default).
        run: function(el, newPos, duration, easeLinearity) {
          this.stop();
          this._el = el;
          this._inProgress = true;
          this._duration = duration || 0.25;
          this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);
          this._startPos = getPosition(el);
          this._offset = newPos.subtract(this._startPos);
          this._startTime = +/* @__PURE__ */ new Date();
          this.fire("start");
          this._animate();
        },
        // @method stop()
        // Stops the animation (if currently running).
        stop: function() {
          if (!this._inProgress) {
            return;
          }
          this._step(true);
          this._complete();
        },
        _animate: function() {
          this._animId = requestAnimFrame(this._animate, this);
          this._step();
        },
        _step: function(round) {
          var elapsed = +/* @__PURE__ */ new Date() - this._startTime, duration = this._duration * 1e3;
          if (elapsed < duration) {
            this._runFrame(this._easeOut(elapsed / duration), round);
          } else {
            this._runFrame(1);
            this._complete();
          }
        },
        _runFrame: function(progress, round) {
          var pos = this._startPos.add(this._offset.multiplyBy(progress));
          if (round) {
            pos._round();
          }
          setPosition(this._el, pos);
          this.fire("step");
        },
        _complete: function() {
          cancelAnimFrame(this._animId);
          this._inProgress = false;
          this.fire("end");
        },
        _easeOut: function(t2) {
          return 1 - Math.pow(1 - t2, this._easeOutPower);
        }
      });
      var Map2 = Evented.extend({
        options: {
          // @section Map State Options
          // @option crs: CRS = L.CRS.EPSG3857
          // The [Coordinate Reference System](#crs) to use. Don't change this if you're not
          // sure what it means.
          crs: EPSG3857,
          // @option center: LatLng = undefined
          // Initial geographic center of the map
          center: void 0,
          // @option zoom: Number = undefined
          // Initial map zoom level
          zoom: void 0,
          // @option minZoom: Number = *
          // Minimum zoom level of the map.
          // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
          // the lowest of their `minZoom` options will be used instead.
          minZoom: void 0,
          // @option maxZoom: Number = *
          // Maximum zoom level of the map.
          // If not specified and at least one `GridLayer` or `TileLayer` is in the map,
          // the highest of their `maxZoom` options will be used instead.
          maxZoom: void 0,
          // @option layers: Layer[] = []
          // Array of layers that will be added to the map initially
          layers: [],
          // @option maxBounds: LatLngBounds = null
          // When this option is set, the map restricts the view to the given
          // geographical bounds, bouncing the user back if the user tries to pan
          // outside the view. To set the restriction dynamically, use
          // [`setMaxBounds`](#map-setmaxbounds) method.
          maxBounds: void 0,
          // @option renderer: Renderer = *
          // The default method for drawing vector layers on the map. `L.SVG`
          // or `L.Canvas` by default depending on browser support.
          renderer: void 0,
          // @section Animation Options
          // @option zoomAnimation: Boolean = true
          // Whether the map zoom animation is enabled. By default it's enabled
          // in all browsers that support CSS3 Transitions except Android.
          zoomAnimation: true,
          // @option zoomAnimationThreshold: Number = 4
          // Won't animate zoom if the zoom difference exceeds this value.
          zoomAnimationThreshold: 4,
          // @option fadeAnimation: Boolean = true
          // Whether the tile fade animation is enabled. By default it's enabled
          // in all browsers that support CSS3 Transitions except Android.
          fadeAnimation: true,
          // @option markerZoomAnimation: Boolean = true
          // Whether markers animate their zoom with the zoom animation, if disabled
          // they will disappear for the length of the animation. By default it's
          // enabled in all browsers that support CSS3 Transitions except Android.
          markerZoomAnimation: true,
          // @option transform3DLimit: Number = 2^23
          // Defines the maximum size of a CSS translation transform. The default
          // value should not be changed unless a web browser positions layers in
          // the wrong place after doing a large `panBy`.
          transform3DLimit: 8388608,
          // Precision limit of a 32-bit float
          // @section Interaction Options
          // @option zoomSnap: Number = 1
          // Forces the map's zoom level to always be a multiple of this, particularly
          // right after a [`fitBounds()`](#map-fitbounds) or a pinch-zoom.
          // By default, the zoom level snaps to the nearest integer; lower values
          // (e.g. `0.5` or `0.1`) allow for greater granularity. A value of `0`
          // means the zoom level will not be snapped after `fitBounds` or a pinch-zoom.
          zoomSnap: 1,
          // @option zoomDelta: Number = 1
          // Controls how much the map's zoom level will change after a
          // [`zoomIn()`](#map-zoomin), [`zoomOut()`](#map-zoomout), pressing `+`
          // or `-` on the keyboard, or using the [zoom controls](#control-zoom).
          // Values smaller than `1` (e.g. `0.5`) allow for greater granularity.
          zoomDelta: 1,
          // @option trackResize: Boolean = true
          // Whether the map automatically handles browser window resize to update itself.
          trackResize: true
        },
        initialize: function(id, options) {
          options = setOptions(this, options);
          this._handlers = [];
          this._layers = {};
          this._zoomBoundLayers = {};
          this._sizeChanged = true;
          this._initContainer(id);
          this._initLayout();
          this._onResize = bind(this._onResize, this);
          this._initEvents();
          if (options.maxBounds) {
            this.setMaxBounds(options.maxBounds);
          }
          if (options.zoom !== void 0) {
            this._zoom = this._limitZoom(options.zoom);
          }
          if (options.center && options.zoom !== void 0) {
            this.setView(toLatLng(options.center), options.zoom, { reset: true });
          }
          this.callInitHooks();
          this._zoomAnimated = TRANSITION && Browser.any3d && !Browser.mobileOpera && this.options.zoomAnimation;
          if (this._zoomAnimated) {
            this._createAnimProxy();
            on(this._proxy, TRANSITION_END, this._catchTransitionEnd, this);
          }
          this._addLayers(this.options.layers);
        },
        // @section Methods for modifying map state
        // @method setView(center: LatLng, zoom: Number, options?: Zoom/pan options): this
        // Sets the view of the map (geographical center and zoom) with the given
        // animation options.
        setView: function(center, zoom2, options) {
          zoom2 = zoom2 === void 0 ? this._zoom : this._limitZoom(zoom2);
          center = this._limitCenter(toLatLng(center), zoom2, this.options.maxBounds);
          options = options || {};
          this._stop();
          if (this._loaded && !options.reset && options !== true) {
            if (options.animate !== void 0) {
              options.zoom = extend({ animate: options.animate }, options.zoom);
              options.pan = extend({ animate: options.animate, duration: options.duration }, options.pan);
            }
            var moved = this._zoom !== zoom2 ? this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom2, options.zoom) : this._tryAnimatedPan(center, options.pan);
            if (moved) {
              clearTimeout(this._sizeTimer);
              return this;
            }
          }
          this._resetView(center, zoom2, options.pan && options.pan.noMoveStart);
          return this;
        },
        // @method setZoom(zoom: Number, options?: Zoom/pan options): this
        // Sets the zoom of the map.
        setZoom: function(zoom2, options) {
          if (!this._loaded) {
            this._zoom = zoom2;
            return this;
          }
          return this.setView(this.getCenter(), zoom2, { zoom: options });
        },
        // @method zoomIn(delta?: Number, options?: Zoom options): this
        // Increases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
        zoomIn: function(delta, options) {
          delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
          return this.setZoom(this._zoom + delta, options);
        },
        // @method zoomOut(delta?: Number, options?: Zoom options): this
        // Decreases the zoom of the map by `delta` ([`zoomDelta`](#map-zoomdelta) by default).
        zoomOut: function(delta, options) {
          delta = delta || (Browser.any3d ? this.options.zoomDelta : 1);
          return this.setZoom(this._zoom - delta, options);
        },
        // @method setZoomAround(latlng: LatLng, zoom: Number, options: Zoom options): this
        // Zooms the map while keeping a specified geographical point on the map
        // stationary (e.g. used internally for scroll zoom and double-click zoom).
        // @alternative
        // @method setZoomAround(offset: Point, zoom: Number, options: Zoom options): this
        // Zooms the map while keeping a specified pixel on the map (relative to the top-left corner) stationary.
        setZoomAround: function(latlng, zoom2, options) {
          var scale2 = this.getZoomScale(zoom2), viewHalf = this.getSize().divideBy(2), containerPoint = latlng instanceof Point ? latlng : this.latLngToContainerPoint(latlng), centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale2), newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));
          return this.setView(newCenter, zoom2, { zoom: options });
        },
        _getBoundsCenterZoom: function(bounds, options) {
          options = options || {};
          bounds = bounds.getBounds ? bounds.getBounds() : toLatLngBounds(bounds);
          var paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]), paddingBR = toPoint(options.paddingBottomRight || options.padding || [0, 0]), zoom2 = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));
          zoom2 = typeof options.maxZoom === "number" ? Math.min(options.maxZoom, zoom2) : zoom2;
          if (zoom2 === Infinity) {
            return {
              center: bounds.getCenter(),
              zoom: zoom2
            };
          }
          var paddingOffset = paddingBR.subtract(paddingTL).divideBy(2), swPoint = this.project(bounds.getSouthWest(), zoom2), nePoint = this.project(bounds.getNorthEast(), zoom2), center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom2);
          return {
            center,
            zoom: zoom2
          };
        },
        // @method fitBounds(bounds: LatLngBounds, options?: fitBounds options): this
        // Sets a map view that contains the given geographical bounds with the
        // maximum zoom level possible.
        fitBounds: function(bounds, options) {
          bounds = toLatLngBounds(bounds);
          if (!bounds.isValid()) {
            throw new Error("Bounds are not valid.");
          }
          var target = this._getBoundsCenterZoom(bounds, options);
          return this.setView(target.center, target.zoom, options);
        },
        // @method fitWorld(options?: fitBounds options): this
        // Sets a map view that mostly contains the whole world with the maximum
        // zoom level possible.
        fitWorld: function(options) {
          return this.fitBounds([[-90, -180], [90, 180]], options);
        },
        // @method panTo(latlng: LatLng, options?: Pan options): this
        // Pans the map to a given center.
        panTo: function(center, options) {
          return this.setView(center, this._zoom, { pan: options });
        },
        // @method panBy(offset: Point, options?: Pan options): this
        // Pans the map by a given number of pixels (animated).
        panBy: function(offset, options) {
          offset = toPoint(offset).round();
          options = options || {};
          if (!offset.x && !offset.y) {
            return this.fire("moveend");
          }
          if (options.animate !== true && !this.getSize().contains(offset)) {
            this._resetView(this.unproject(this.project(this.getCenter()).add(offset)), this.getZoom());
            return this;
          }
          if (!this._panAnim) {
            this._panAnim = new PosAnimation();
            this._panAnim.on({
              "step": this._onPanTransitionStep,
              "end": this._onPanTransitionEnd
            }, this);
          }
          if (!options.noMoveStart) {
            this.fire("movestart");
          }
          if (options.animate !== false) {
            addClass(this._mapPane, "leaflet-pan-anim");
            var newPos = this._getMapPanePos().subtract(offset).round();
            this._panAnim.run(this._mapPane, newPos, options.duration || 0.25, options.easeLinearity);
          } else {
            this._rawPanBy(offset);
            this.fire("move").fire("moveend");
          }
          return this;
        },
        // @method flyTo(latlng: LatLng, zoom?: Number, options?: Zoom/pan options): this
        // Sets the view of the map (geographical center and zoom) performing a smooth
        // pan-zoom animation.
        flyTo: function(targetCenter, targetZoom, options) {
          options = options || {};
          if (options.animate === false || !Browser.any3d) {
            return this.setView(targetCenter, targetZoom, options);
          }
          this._stop();
          var from = this.project(this.getCenter()), to = this.project(targetCenter), size = this.getSize(), startZoom = this._zoom;
          targetCenter = toLatLng(targetCenter);
          targetZoom = targetZoom === void 0 ? startZoom : targetZoom;
          var w0 = Math.max(size.x, size.y), w1 = w0 * this.getZoomScale(startZoom, targetZoom), u1 = to.distanceTo(from) || 1, rho = 1.42, rho2 = rho * rho;
          function r2(i2) {
            var s1 = i2 ? -1 : 1, s2 = i2 ? w1 : w0, t1 = w1 * w1 - w0 * w0 + s1 * rho2 * rho2 * u1 * u1, b1 = 2 * s2 * rho2 * u1, b2 = t1 / b1, sq = Math.sqrt(b2 * b2 + 1) - b2;
            var log = sq < 1e-9 ? -18 : Math.log(sq);
            return log;
          }
          function sinh(n2) {
            return (Math.exp(n2) - Math.exp(-n2)) / 2;
          }
          function cosh(n2) {
            return (Math.exp(n2) + Math.exp(-n2)) / 2;
          }
          function tanh(n2) {
            return sinh(n2) / cosh(n2);
          }
          var r0 = r2(0);
          function w2(s2) {
            return w0 * (cosh(r0) / cosh(r0 + rho * s2));
          }
          function u2(s2) {
            return w0 * (cosh(r0) * tanh(r0 + rho * s2) - sinh(r0)) / rho2;
          }
          function easeOut(t2) {
            return 1 - Math.pow(1 - t2, 1.5);
          }
          var start = Date.now(), S3 = (r2(1) - r0) / rho, duration = options.duration ? 1e3 * options.duration : 1e3 * S3 * 0.8;
          function frame() {
            var t2 = (Date.now() - start) / duration, s2 = easeOut(t2) * S3;
            if (t2 <= 1) {
              this._flyToFrame = requestAnimFrame(frame, this);
              this._move(
                this.unproject(from.add(to.subtract(from).multiplyBy(u2(s2) / u1)), startZoom),
                this.getScaleZoom(w0 / w2(s2), startZoom),
                { flyTo: true }
              );
            } else {
              this._move(targetCenter, targetZoom)._moveEnd(true);
            }
          }
          this._moveStart(true, options.noMoveStart);
          frame.call(this);
          return this;
        },
        // @method flyToBounds(bounds: LatLngBounds, options?: fitBounds options): this
        // Sets the view of the map with a smooth animation like [`flyTo`](#map-flyto),
        // but takes a bounds parameter like [`fitBounds`](#map-fitbounds).
        flyToBounds: function(bounds, options) {
          var target = this._getBoundsCenterZoom(bounds, options);
          return this.flyTo(target.center, target.zoom, options);
        },
        // @method setMaxBounds(bounds: LatLngBounds): this
        // Restricts the map view to the given bounds (see the [maxBounds](#map-maxbounds) option).
        setMaxBounds: function(bounds) {
          bounds = toLatLngBounds(bounds);
          if (this.listens("moveend", this._panInsideMaxBounds)) {
            this.off("moveend", this._panInsideMaxBounds);
          }
          if (!bounds.isValid()) {
            this.options.maxBounds = null;
            return this;
          }
          this.options.maxBounds = bounds;
          if (this._loaded) {
            this._panInsideMaxBounds();
          }
          return this.on("moveend", this._panInsideMaxBounds);
        },
        // @method setMinZoom(zoom: Number): this
        // Sets the lower limit for the available zoom levels (see the [minZoom](#map-minzoom) option).
        setMinZoom: function(zoom2) {
          var oldZoom = this.options.minZoom;
          this.options.minZoom = zoom2;
          if (this._loaded && oldZoom !== zoom2) {
            this.fire("zoomlevelschange");
            if (this.getZoom() < this.options.minZoom) {
              return this.setZoom(zoom2);
            }
          }
          return this;
        },
        // @method setMaxZoom(zoom: Number): this
        // Sets the upper limit for the available zoom levels (see the [maxZoom](#map-maxzoom) option).
        setMaxZoom: function(zoom2) {
          var oldZoom = this.options.maxZoom;
          this.options.maxZoom = zoom2;
          if (this._loaded && oldZoom !== zoom2) {
            this.fire("zoomlevelschange");
            if (this.getZoom() > this.options.maxZoom) {
              return this.setZoom(zoom2);
            }
          }
          return this;
        },
        // @method panInsideBounds(bounds: LatLngBounds, options?: Pan options): this
        // Pans the map to the closest view that would lie inside the given bounds (if it's not already), controlling the animation using the options specific, if any.
        panInsideBounds: function(bounds, options) {
          this._enforcingBounds = true;
          var center = this.getCenter(), newCenter = this._limitCenter(center, this._zoom, toLatLngBounds(bounds));
          if (!center.equals(newCenter)) {
            this.panTo(newCenter, options);
          }
          this._enforcingBounds = false;
          return this;
        },
        // @method panInside(latlng: LatLng, options?: padding options): this
        // Pans the map the minimum amount to make the `latlng` visible. Use
        // padding options to fit the display to more restricted bounds.
        // If `latlng` is already within the (optionally padded) display bounds,
        // the map will not be panned.
        panInside: function(latlng, options) {
          options = options || {};
          var paddingTL = toPoint(options.paddingTopLeft || options.padding || [0, 0]), paddingBR = toPoint(options.paddingBottomRight || options.padding || [0, 0]), pixelCenter = this.project(this.getCenter()), pixelPoint = this.project(latlng), pixelBounds = this.getPixelBounds(), paddedBounds = toBounds([pixelBounds.min.add(paddingTL), pixelBounds.max.subtract(paddingBR)]), paddedSize = paddedBounds.getSize();
          if (!paddedBounds.contains(pixelPoint)) {
            this._enforcingBounds = true;
            var centerOffset = pixelPoint.subtract(paddedBounds.getCenter());
            var offset = paddedBounds.extend(pixelPoint).getSize().subtract(paddedSize);
            pixelCenter.x += centerOffset.x < 0 ? -offset.x : offset.x;
            pixelCenter.y += centerOffset.y < 0 ? -offset.y : offset.y;
            this.panTo(this.unproject(pixelCenter), options);
            this._enforcingBounds = false;
          }
          return this;
        },
        // @method invalidateSize(options: Zoom/pan options): this
        // Checks if the map container size changed and updates the map if so —
        // call it after you've changed the map size dynamically, also animating
        // pan by default. If `options.pan` is `false`, panning will not occur.
        // If `options.debounceMoveend` is `true`, it will delay `moveend` event so
        // that it doesn't happen often even if the method is called many
        // times in a row.
        // @alternative
        // @method invalidateSize(animate: Boolean): this
        // Checks if the map container size changed and updates the map if so —
        // call it after you've changed the map size dynamically, also animating
        // pan by default.
        invalidateSize: function(options) {
          if (!this._loaded) {
            return this;
          }
          options = extend({
            animate: false,
            pan: true
          }, options === true ? { animate: true } : options);
          var oldSize = this.getSize();
          this._sizeChanged = true;
          this._lastCenter = null;
          var newSize = this.getSize(), oldCenter = oldSize.divideBy(2).round(), newCenter = newSize.divideBy(2).round(), offset = oldCenter.subtract(newCenter);
          if (!offset.x && !offset.y) {
            return this;
          }
          if (options.animate && options.pan) {
            this.panBy(offset);
          } else {
            if (options.pan) {
              this._rawPanBy(offset);
            }
            this.fire("move");
            if (options.debounceMoveend) {
              clearTimeout(this._sizeTimer);
              this._sizeTimer = setTimeout(bind(this.fire, this, "moveend"), 200);
            } else {
              this.fire("moveend");
            }
          }
          return this.fire("resize", {
            oldSize,
            newSize
          });
        },
        // @section Methods for modifying map state
        // @method stop(): this
        // Stops the currently running `panTo` or `flyTo` animation, if any.
        stop: function() {
          this.setZoom(this._limitZoom(this._zoom));
          if (!this.options.zoomSnap) {
            this.fire("viewreset");
          }
          return this._stop();
        },
        // @section Geolocation methods
        // @method locate(options?: Locate options): this
        // Tries to locate the user using the Geolocation API, firing a [`locationfound`](#map-locationfound)
        // event with location data on success or a [`locationerror`](#map-locationerror) event on failure,
        // and optionally sets the map view to the user's location with respect to
        // detection accuracy (or to the world view if geolocation failed).
        // Note that, if your page doesn't use HTTPS, this method will fail in
        // modern browsers ([Chrome 50 and newer](https://sites.google.com/a/chromium.org/dev/Home/chromium-security/deprecating-powerful-features-on-insecure-origins))
        // See `Locate options` for more details.
        locate: function(options) {
          options = this._locateOptions = extend({
            timeout: 1e4,
            watch: false
            // setView: false
            // maxZoom: <Number>
            // maximumAge: 0
            // enableHighAccuracy: false
          }, options);
          if (!("geolocation" in navigator)) {
            this._handleGeolocationError({
              code: 0,
              message: "Geolocation not supported."
            });
            return this;
          }
          var onResponse = bind(this._handleGeolocationResponse, this), onError = bind(this._handleGeolocationError, this);
          if (options.watch) {
            this._locationWatchId = navigator.geolocation.watchPosition(onResponse, onError, options);
          } else {
            navigator.geolocation.getCurrentPosition(onResponse, onError, options);
          }
          return this;
        },
        // @method stopLocate(): this
        // Stops watching location previously initiated by `map.locate({watch: true})`
        // and aborts resetting the map view if map.locate was called with
        // `{setView: true}`.
        stopLocate: function() {
          if (navigator.geolocation && navigator.geolocation.clearWatch) {
            navigator.geolocation.clearWatch(this._locationWatchId);
          }
          if (this._locateOptions) {
            this._locateOptions.setView = false;
          }
          return this;
        },
        _handleGeolocationError: function(error) {
          if (!this._container._leaflet_id) {
            return;
          }
          var c2 = error.code, message = error.message || (c2 === 1 ? "permission denied" : c2 === 2 ? "position unavailable" : "timeout");
          if (this._locateOptions.setView && !this._loaded) {
            this.fitWorld();
          }
          this.fire("locationerror", {
            code: c2,
            message: "Geolocation error: " + message + "."
          });
        },
        _handleGeolocationResponse: function(pos) {
          if (!this._container._leaflet_id) {
            return;
          }
          var lat = pos.coords.latitude, lng = pos.coords.longitude, latlng = new LatLng(lat, lng), bounds = latlng.toBounds(pos.coords.accuracy * 2), options = this._locateOptions;
          if (options.setView) {
            var zoom2 = this.getBoundsZoom(bounds);
            this.setView(latlng, options.maxZoom ? Math.min(zoom2, options.maxZoom) : zoom2);
          }
          var data = {
            latlng,
            bounds,
            timestamp: pos.timestamp
          };
          for (var i2 in pos.coords) {
            if (typeof pos.coords[i2] === "number") {
              data[i2] = pos.coords[i2];
            }
          }
          this.fire("locationfound", data);
        },
        // TODO Appropriate docs section?
        // @section Other Methods
        // @method addHandler(name: String, HandlerClass: Function): this
        // Adds a new `Handler` to the map, given its name and constructor function.
        addHandler: function(name, HandlerClass) {
          if (!HandlerClass) {
            return this;
          }
          var handler = this[name] = new HandlerClass(this);
          this._handlers.push(handler);
          if (this.options[name]) {
            handler.enable();
          }
          return this;
        },
        // @method remove(): this
        // Destroys the map and clears all related event listeners.
        remove: function() {
          this._initEvents(true);
          if (this.options.maxBounds) {
            this.off("moveend", this._panInsideMaxBounds);
          }
          if (this._containerId !== this._container._leaflet_id) {
            throw new Error("Map container is being reused by another instance");
          }
          try {
            delete this._container._leaflet_id;
            delete this._containerId;
          } catch (e2) {
            this._container._leaflet_id = void 0;
            this._containerId = void 0;
          }
          if (this._locationWatchId !== void 0) {
            this.stopLocate();
          }
          this._stop();
          remove(this._mapPane);
          if (this._clearControlPos) {
            this._clearControlPos();
          }
          if (this._resizeRequest) {
            cancelAnimFrame(this._resizeRequest);
            this._resizeRequest = null;
          }
          this._clearHandlers();
          if (this._loaded) {
            this.fire("unload");
          }
          var i2;
          for (i2 in this._layers) {
            this._layers[i2].remove();
          }
          for (i2 in this._panes) {
            remove(this._panes[i2]);
          }
          this._layers = [];
          this._panes = [];
          delete this._mapPane;
          delete this._renderer;
          return this;
        },
        // @section Other Methods
        // @method createPane(name: String, container?: HTMLElement): HTMLElement
        // Creates a new [map pane](#map-pane) with the given name if it doesn't exist already,
        // then returns it. The pane is created as a child of `container`, or
        // as a child of the main map pane if not set.
        createPane: function(name, container) {
          var className = "leaflet-pane" + (name ? " leaflet-" + name.replace("Pane", "") + "-pane" : ""), pane = create$1("div", className, container || this._mapPane);
          if (name) {
            this._panes[name] = pane;
          }
          return pane;
        },
        // @section Methods for Getting Map State
        // @method getCenter(): LatLng
        // Returns the geographical center of the map view
        getCenter: function() {
          this._checkIfLoaded();
          if (this._lastCenter && !this._moved()) {
            return this._lastCenter.clone();
          }
          return this.layerPointToLatLng(this._getCenterLayerPoint());
        },
        // @method getZoom(): Number
        // Returns the current zoom level of the map view
        getZoom: function() {
          return this._zoom;
        },
        // @method getBounds(): LatLngBounds
        // Returns the geographical bounds visible in the current map view
        getBounds: function() {
          var bounds = this.getPixelBounds(), sw = this.unproject(bounds.getBottomLeft()), ne2 = this.unproject(bounds.getTopRight());
          return new LatLngBounds(sw, ne2);
        },
        // @method getMinZoom(): Number
        // Returns the minimum zoom level of the map (if set in the `minZoom` option of the map or of any layers), or `0` by default.
        getMinZoom: function() {
          return this.options.minZoom === void 0 ? this._layersMinZoom || 0 : this.options.minZoom;
        },
        // @method getMaxZoom(): Number
        // Returns the maximum zoom level of the map (if set in the `maxZoom` option of the map or of any layers).
        getMaxZoom: function() {
          return this.options.maxZoom === void 0 ? this._layersMaxZoom === void 0 ? Infinity : this._layersMaxZoom : this.options.maxZoom;
        },
        // @method getBoundsZoom(bounds: LatLngBounds, inside?: Boolean, padding?: Point): Number
        // Returns the maximum zoom level on which the given bounds fit to the map
        // view in its entirety. If `inside` (optional) is set to `true`, the method
        // instead returns the minimum zoom level on which the map view fits into
        // the given bounds in its entirety.
        getBoundsZoom: function(bounds, inside, padding) {
          bounds = toLatLngBounds(bounds);
          padding = toPoint(padding || [0, 0]);
          var zoom2 = this.getZoom() || 0, min = this.getMinZoom(), max = this.getMaxZoom(), nw = bounds.getNorthWest(), se2 = bounds.getSouthEast(), size = this.getSize().subtract(padding), boundsSize = toBounds(this.project(se2, zoom2), this.project(nw, zoom2)).getSize(), snap = Browser.any3d ? this.options.zoomSnap : 1, scalex = size.x / boundsSize.x, scaley = size.y / boundsSize.y, scale2 = inside ? Math.max(scalex, scaley) : Math.min(scalex, scaley);
          zoom2 = this.getScaleZoom(scale2, zoom2);
          if (snap) {
            zoom2 = Math.round(zoom2 / (snap / 100)) * (snap / 100);
            zoom2 = inside ? Math.ceil(zoom2 / snap) * snap : Math.floor(zoom2 / snap) * snap;
          }
          return Math.max(min, Math.min(max, zoom2));
        },
        // @method getSize(): Point
        // Returns the current size of the map container (in pixels).
        getSize: function() {
          if (!this._size || this._sizeChanged) {
            this._size = new Point(
              this._container.clientWidth || 0,
              this._container.clientHeight || 0
            );
            this._sizeChanged = false;
          }
          return this._size.clone();
        },
        // @method getPixelBounds(): Bounds
        // Returns the bounds of the current map view in projected pixel
        // coordinates (sometimes useful in layer and overlay implementations).
        getPixelBounds: function(center, zoom2) {
          var topLeftPoint = this._getTopLeftPoint(center, zoom2);
          return new Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
        },
        // TODO: Check semantics - isn't the pixel origin the 0,0 coord relative to
        // the map pane? "left point of the map layer" can be confusing, specially
        // since there can be negative offsets.
        // @method getPixelOrigin(): Point
        // Returns the projected pixel coordinates of the top left point of
        // the map layer (useful in custom layer and overlay implementations).
        getPixelOrigin: function() {
          this._checkIfLoaded();
          return this._pixelOrigin;
        },
        // @method getPixelWorldBounds(zoom?: Number): Bounds
        // Returns the world's bounds in pixel coordinates for zoom level `zoom`.
        // If `zoom` is omitted, the map's current zoom level is used.
        getPixelWorldBounds: function(zoom2) {
          return this.options.crs.getProjectedBounds(zoom2 === void 0 ? this.getZoom() : zoom2);
        },
        // @section Other Methods
        // @method getPane(pane: String|HTMLElement): HTMLElement
        // Returns a [map pane](#map-pane), given its name or its HTML element (its identity).
        getPane: function(pane) {
          return typeof pane === "string" ? this._panes[pane] : pane;
        },
        // @method getPanes(): Object
        // Returns a plain object containing the names of all [panes](#map-pane) as keys and
        // the panes as values.
        getPanes: function() {
          return this._panes;
        },
        // @method getContainer: HTMLElement
        // Returns the HTML element that contains the map.
        getContainer: function() {
          return this._container;
        },
        // @section Conversion Methods
        // @method getZoomScale(toZoom: Number, fromZoom: Number): Number
        // Returns the scale factor to be applied to a map transition from zoom level
        // `fromZoom` to `toZoom`. Used internally to help with zoom animations.
        getZoomScale: function(toZoom, fromZoom) {
          var crs = this.options.crs;
          fromZoom = fromZoom === void 0 ? this._zoom : fromZoom;
          return crs.scale(toZoom) / crs.scale(fromZoom);
        },
        // @method getScaleZoom(scale: Number, fromZoom: Number): Number
        // Returns the zoom level that the map would end up at, if it is at `fromZoom`
        // level and everything is scaled by a factor of `scale`. Inverse of
        // [`getZoomScale`](#map-getZoomScale).
        getScaleZoom: function(scale2, fromZoom) {
          var crs = this.options.crs;
          fromZoom = fromZoom === void 0 ? this._zoom : fromZoom;
          var zoom2 = crs.zoom(scale2 * crs.scale(fromZoom));
          return isNaN(zoom2) ? Infinity : zoom2;
        },
        // @method project(latlng: LatLng, zoom: Number): Point
        // Projects a geographical coordinate `LatLng` according to the projection
        // of the map's CRS, then scales it according to `zoom` and the CRS's
        // `Transformation`. The result is pixel coordinate relative to
        // the CRS origin.
        project: function(latlng, zoom2) {
          zoom2 = zoom2 === void 0 ? this._zoom : zoom2;
          return this.options.crs.latLngToPoint(toLatLng(latlng), zoom2);
        },
        // @method unproject(point: Point, zoom: Number): LatLng
        // Inverse of [`project`](#map-project).
        unproject: function(point, zoom2) {
          zoom2 = zoom2 === void 0 ? this._zoom : zoom2;
          return this.options.crs.pointToLatLng(toPoint(point), zoom2);
        },
        // @method layerPointToLatLng(point: Point): LatLng
        // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
        // returns the corresponding geographical coordinate (for the current zoom level).
        layerPointToLatLng: function(point) {
          var projectedPoint = toPoint(point).add(this.getPixelOrigin());
          return this.unproject(projectedPoint);
        },
        // @method latLngToLayerPoint(latlng: LatLng): Point
        // Given a geographical coordinate, returns the corresponding pixel coordinate
        // relative to the [origin pixel](#map-getpixelorigin).
        latLngToLayerPoint: function(latlng) {
          var projectedPoint = this.project(toLatLng(latlng))._round();
          return projectedPoint._subtract(this.getPixelOrigin());
        },
        // @method wrapLatLng(latlng: LatLng): LatLng
        // Returns a `LatLng` where `lat` and `lng` has been wrapped according to the
        // map's CRS's `wrapLat` and `wrapLng` properties, if they are outside the
        // CRS's bounds.
        // By default this means longitude is wrapped around the dateline so its
        // value is between -180 and +180 degrees.
        wrapLatLng: function(latlng) {
          return this.options.crs.wrapLatLng(toLatLng(latlng));
        },
        // @method wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds
        // Returns a `LatLngBounds` with the same size as the given one, ensuring that
        // its center is within the CRS's bounds.
        // By default this means the center longitude is wrapped around the dateline so its
        // value is between -180 and +180 degrees, and the majority of the bounds
        // overlaps the CRS's bounds.
        wrapLatLngBounds: function(latlng) {
          return this.options.crs.wrapLatLngBounds(toLatLngBounds(latlng));
        },
        // @method distance(latlng1: LatLng, latlng2: LatLng): Number
        // Returns the distance between two geographical coordinates according to
        // the map's CRS. By default this measures distance in meters.
        distance: function(latlng1, latlng2) {
          return this.options.crs.distance(toLatLng(latlng1), toLatLng(latlng2));
        },
        // @method containerPointToLayerPoint(point: Point): Point
        // Given a pixel coordinate relative to the map container, returns the corresponding
        // pixel coordinate relative to the [origin pixel](#map-getpixelorigin).
        containerPointToLayerPoint: function(point) {
          return toPoint(point).subtract(this._getMapPanePos());
        },
        // @method layerPointToContainerPoint(point: Point): Point
        // Given a pixel coordinate relative to the [origin pixel](#map-getpixelorigin),
        // returns the corresponding pixel coordinate relative to the map container.
        layerPointToContainerPoint: function(point) {
          return toPoint(point).add(this._getMapPanePos());
        },
        // @method containerPointToLatLng(point: Point): LatLng
        // Given a pixel coordinate relative to the map container, returns
        // the corresponding geographical coordinate (for the current zoom level).
        containerPointToLatLng: function(point) {
          var layerPoint = this.containerPointToLayerPoint(toPoint(point));
          return this.layerPointToLatLng(layerPoint);
        },
        // @method latLngToContainerPoint(latlng: LatLng): Point
        // Given a geographical coordinate, returns the corresponding pixel coordinate
        // relative to the map container.
        latLngToContainerPoint: function(latlng) {
          return this.layerPointToContainerPoint(this.latLngToLayerPoint(toLatLng(latlng)));
        },
        // @method mouseEventToContainerPoint(ev: MouseEvent): Point
        // Given a MouseEvent object, returns the pixel coordinate relative to the
        // map container where the event took place.
        mouseEventToContainerPoint: function(e2) {
          return getMousePosition(e2, this._container);
        },
        // @method mouseEventToLayerPoint(ev: MouseEvent): Point
        // Given a MouseEvent object, returns the pixel coordinate relative to
        // the [origin pixel](#map-getpixelorigin) where the event took place.
        mouseEventToLayerPoint: function(e2) {
          return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e2));
        },
        // @method mouseEventToLatLng(ev: MouseEvent): LatLng
        // Given a MouseEvent object, returns geographical coordinate where the
        // event took place.
        mouseEventToLatLng: function(e2) {
          return this.layerPointToLatLng(this.mouseEventToLayerPoint(e2));
        },
        // map initialization methods
        _initContainer: function(id) {
          var container = this._container = get(id);
          if (!container) {
            throw new Error("Map container not found.");
          } else if (container._leaflet_id) {
            throw new Error("Map container is already initialized.");
          }
          on(container, "scroll", this._onScroll, this);
          this._containerId = stamp(container);
        },
        _initLayout: function() {
          var container = this._container;
          this._fadeAnimated = this.options.fadeAnimation && Browser.any3d;
          addClass(container, "leaflet-container" + (Browser.touch ? " leaflet-touch" : "") + (Browser.retina ? " leaflet-retina" : "") + (Browser.ielt9 ? " leaflet-oldie" : "") + (Browser.safari ? " leaflet-safari" : "") + (this._fadeAnimated ? " leaflet-fade-anim" : ""));
          var position = getStyle(container, "position");
          if (position !== "absolute" && position !== "relative" && position !== "fixed" && position !== "sticky") {
            container.style.position = "relative";
          }
          this._initPanes();
          if (this._initControlPos) {
            this._initControlPos();
          }
        },
        _initPanes: function() {
          var panes = this._panes = {};
          this._paneRenderers = {};
          this._mapPane = this.createPane("mapPane", this._container);
          setPosition(this._mapPane, new Point(0, 0));
          this.createPane("tilePane");
          this.createPane("overlayPane");
          this.createPane("shadowPane");
          this.createPane("markerPane");
          this.createPane("tooltipPane");
          this.createPane("popupPane");
          if (!this.options.markerZoomAnimation) {
            addClass(panes.markerPane, "leaflet-zoom-hide");
            addClass(panes.shadowPane, "leaflet-zoom-hide");
          }
        },
        // private methods that modify map state
        // @section Map state change events
        _resetView: function(center, zoom2, noMoveStart) {
          setPosition(this._mapPane, new Point(0, 0));
          var loading = !this._loaded;
          this._loaded = true;
          zoom2 = this._limitZoom(zoom2);
          this.fire("viewprereset");
          var zoomChanged = this._zoom !== zoom2;
          this._moveStart(zoomChanged, noMoveStart)._move(center, zoom2)._moveEnd(zoomChanged);
          this.fire("viewreset");
          if (loading) {
            this.fire("load");
          }
        },
        _moveStart: function(zoomChanged, noMoveStart) {
          if (zoomChanged) {
            this.fire("zoomstart");
          }
          if (!noMoveStart) {
            this.fire("movestart");
          }
          return this;
        },
        _move: function(center, zoom2, data, supressEvent) {
          if (zoom2 === void 0) {
            zoom2 = this._zoom;
          }
          var zoomChanged = this._zoom !== zoom2;
          this._zoom = zoom2;
          this._lastCenter = center;
          this._pixelOrigin = this._getNewPixelOrigin(center);
          if (!supressEvent) {
            if (zoomChanged || data && data.pinch) {
              this.fire("zoom", data);
            }
            this.fire("move", data);
          } else if (data && data.pinch) {
            this.fire("zoom", data);
          }
          return this;
        },
        _moveEnd: function(zoomChanged) {
          if (zoomChanged) {
            this.fire("zoomend");
          }
          return this.fire("moveend");
        },
        _stop: function() {
          cancelAnimFrame(this._flyToFrame);
          if (this._panAnim) {
            this._panAnim.stop();
          }
          return this;
        },
        _rawPanBy: function(offset) {
          setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
        },
        _getZoomSpan: function() {
          return this.getMaxZoom() - this.getMinZoom();
        },
        _panInsideMaxBounds: function() {
          if (!this._enforcingBounds) {
            this.panInsideBounds(this.options.maxBounds);
          }
        },
        _checkIfLoaded: function() {
          if (!this._loaded) {
            throw new Error("Set map center and zoom first.");
          }
        },
        // DOM event handling
        // @section Interaction events
        _initEvents: function(remove2) {
          this._targets = {};
          this._targets[stamp(this._container)] = this;
          var onOff = remove2 ? off : on;
          onOff(this._container, "click dblclick mousedown mouseup mouseover mouseout mousemove contextmenu keypress keydown keyup", this._handleDOMEvent, this);
          if (this.options.trackResize) {
            onOff(window, "resize", this._onResize, this);
          }
          if (Browser.any3d && this.options.transform3DLimit) {
            (remove2 ? this.off : this.on).call(this, "moveend", this._onMoveEnd);
          }
        },
        _onResize: function() {
          cancelAnimFrame(this._resizeRequest);
          this._resizeRequest = requestAnimFrame(
            function() {
              this.invalidateSize({ debounceMoveend: true });
            },
            this
          );
        },
        _onScroll: function() {
          this._container.scrollTop = 0;
          this._container.scrollLeft = 0;
        },
        _onMoveEnd: function() {
          var pos = this._getMapPanePos();
          if (Math.max(Math.abs(pos.x), Math.abs(pos.y)) >= this.options.transform3DLimit) {
            this._resetView(this.getCenter(), this.getZoom());
          }
        },
        _findEventTargets: function(e2, type) {
          var targets = [], target, isHover = type === "mouseout" || type === "mouseover", src = e2.target || e2.srcElement, dragging = false;
          while (src) {
            target = this._targets[stamp(src)];
            if (target && (type === "click" || type === "preclick") && this._draggableMoved(target)) {
              dragging = true;
              break;
            }
            if (target && target.listens(type, true)) {
              if (isHover && !isExternalTarget(src, e2)) {
                break;
              }
              targets.push(target);
              if (isHover) {
                break;
              }
            }
            if (src === this._container) {
              break;
            }
            src = src.parentNode;
          }
          if (!targets.length && !dragging && !isHover && this.listens(type, true)) {
            targets = [this];
          }
          return targets;
        },
        _isClickDisabled: function(el) {
          while (el && el !== this._container) {
            if (el["_leaflet_disable_click"]) {
              return true;
            }
            el = el.parentNode;
          }
        },
        _handleDOMEvent: function(e2) {
          var el = e2.target || e2.srcElement;
          if (!this._loaded || el["_leaflet_disable_events"] || e2.type === "click" && this._isClickDisabled(el)) {
            return;
          }
          var type = e2.type;
          if (type === "mousedown") {
            preventOutline(el);
          }
          this._fireDOMEvent(e2, type);
        },
        _mouseEvents: ["click", "dblclick", "mouseover", "mouseout", "contextmenu"],
        _fireDOMEvent: function(e2, type, canvasTargets) {
          if (e2.type === "click") {
            var synth = extend({}, e2);
            synth.type = "preclick";
            this._fireDOMEvent(synth, synth.type, canvasTargets);
          }
          var targets = this._findEventTargets(e2, type);
          if (canvasTargets) {
            var filtered = [];
            for (var i2 = 0; i2 < canvasTargets.length; i2++) {
              if (canvasTargets[i2].listens(type, true)) {
                filtered.push(canvasTargets[i2]);
              }
            }
            targets = filtered.concat(targets);
          }
          if (!targets.length) {
            return;
          }
          if (type === "contextmenu") {
            preventDefault(e2);
          }
          var target = targets[0];
          var data = {
            originalEvent: e2
          };
          if (e2.type !== "keypress" && e2.type !== "keydown" && e2.type !== "keyup") {
            var isMarker = target.getLatLng && (!target._radius || target._radius <= 10);
            data.containerPoint = isMarker ? this.latLngToContainerPoint(target.getLatLng()) : this.mouseEventToContainerPoint(e2);
            data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
            data.latlng = isMarker ? target.getLatLng() : this.layerPointToLatLng(data.layerPoint);
          }
          for (i2 = 0; i2 < targets.length; i2++) {
            targets[i2].fire(type, data, true);
            if (data.originalEvent._stopped || targets[i2].options.bubblingMouseEvents === false && indexOf(this._mouseEvents, type) !== -1) {
              return;
            }
          }
        },
        _draggableMoved: function(obj) {
          obj = obj.dragging && obj.dragging.enabled() ? obj : this;
          return obj.dragging && obj.dragging.moved() || this.boxZoom && this.boxZoom.moved();
        },
        _clearHandlers: function() {
          for (var i2 = 0, len = this._handlers.length; i2 < len; i2++) {
            this._handlers[i2].disable();
          }
        },
        // @section Other Methods
        // @method whenReady(fn: Function, context?: Object): this
        // Runs the given function `fn` when the map gets initialized with
        // a view (center and zoom) and at least one layer, or immediately
        // if it's already initialized, optionally passing a function context.
        whenReady: function(callback, context) {
          if (this._loaded) {
            callback.call(context || this, { target: this });
          } else {
            this.on("load", callback, context);
          }
          return this;
        },
        // private methods for getting map state
        _getMapPanePos: function() {
          return getPosition(this._mapPane) || new Point(0, 0);
        },
        _moved: function() {
          var pos = this._getMapPanePos();
          return pos && !pos.equals([0, 0]);
        },
        _getTopLeftPoint: function(center, zoom2) {
          var pixelOrigin = center && zoom2 !== void 0 ? this._getNewPixelOrigin(center, zoom2) : this.getPixelOrigin();
          return pixelOrigin.subtract(this._getMapPanePos());
        },
        _getNewPixelOrigin: function(center, zoom2) {
          var viewHalf = this.getSize()._divideBy(2);
          return this.project(center, zoom2)._subtract(viewHalf)._add(this._getMapPanePos())._round();
        },
        _latLngToNewLayerPoint: function(latlng, zoom2, center) {
          var topLeft = this._getNewPixelOrigin(center, zoom2);
          return this.project(latlng, zoom2)._subtract(topLeft);
        },
        _latLngBoundsToNewLayerBounds: function(latLngBounds, zoom2, center) {
          var topLeft = this._getNewPixelOrigin(center, zoom2);
          return toBounds([
            this.project(latLngBounds.getSouthWest(), zoom2)._subtract(topLeft),
            this.project(latLngBounds.getNorthWest(), zoom2)._subtract(topLeft),
            this.project(latLngBounds.getSouthEast(), zoom2)._subtract(topLeft),
            this.project(latLngBounds.getNorthEast(), zoom2)._subtract(topLeft)
          ]);
        },
        // layer point of the current center
        _getCenterLayerPoint: function() {
          return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
        },
        // offset of the specified place to the current center in pixels
        _getCenterOffset: function(latlng) {
          return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
        },
        // adjust center for view to get inside bounds
        _limitCenter: function(center, zoom2, bounds) {
          if (!bounds) {
            return center;
          }
          var centerPoint = this.project(center, zoom2), viewHalf = this.getSize().divideBy(2), viewBounds = new Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)), offset = this._getBoundsOffset(viewBounds, bounds, zoom2);
          if (Math.abs(offset.x) <= 1 && Math.abs(offset.y) <= 1) {
            return center;
          }
          return this.unproject(centerPoint.add(offset), zoom2);
        },
        // adjust offset for view to get inside bounds
        _limitOffset: function(offset, bounds) {
          if (!bounds) {
            return offset;
          }
          var viewBounds = this.getPixelBounds(), newBounds = new Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));
          return offset.add(this._getBoundsOffset(newBounds, bounds));
        },
        // returns offset needed for pxBounds to get inside maxBounds at a specified zoom
        _getBoundsOffset: function(pxBounds, maxBounds, zoom2) {
          var projectedMaxBounds = toBounds(
            this.project(maxBounds.getNorthEast(), zoom2),
            this.project(maxBounds.getSouthWest(), zoom2)
          ), minOffset = projectedMaxBounds.min.subtract(pxBounds.min), maxOffset = projectedMaxBounds.max.subtract(pxBounds.max), dx = this._rebound(minOffset.x, -maxOffset.x), dy = this._rebound(minOffset.y, -maxOffset.y);
          return new Point(dx, dy);
        },
        _rebound: function(left, right) {
          return left + right > 0 ? Math.round(left - right) / 2 : Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
        },
        _limitZoom: function(zoom2) {
          var min = this.getMinZoom(), max = this.getMaxZoom(), snap = Browser.any3d ? this.options.zoomSnap : 1;
          if (snap) {
            zoom2 = Math.round(zoom2 / snap) * snap;
          }
          return Math.max(min, Math.min(max, zoom2));
        },
        _onPanTransitionStep: function() {
          this.fire("move");
        },
        _onPanTransitionEnd: function() {
          removeClass(this._mapPane, "leaflet-pan-anim");
          this.fire("moveend");
        },
        _tryAnimatedPan: function(center, options) {
          var offset = this._getCenterOffset(center)._trunc();
          if ((options && options.animate) !== true && !this.getSize().contains(offset)) {
            return false;
          }
          this.panBy(offset, options);
          return true;
        },
        _createAnimProxy: function() {
          var proxy = this._proxy = create$1("div", "leaflet-proxy leaflet-zoom-animated");
          this._panes.mapPane.appendChild(proxy);
          this.on("zoomanim", function(e2) {
            var prop = TRANSFORM, transform = this._proxy.style[prop];
            setTransform(this._proxy, this.project(e2.center, e2.zoom), this.getZoomScale(e2.zoom, 1));
            if (transform === this._proxy.style[prop] && this._animatingZoom) {
              this._onZoomTransitionEnd();
            }
          }, this);
          this.on("load moveend", this._animMoveEnd, this);
          this._on("unload", this._destroyAnimProxy, this);
        },
        _destroyAnimProxy: function() {
          remove(this._proxy);
          this.off("load moveend", this._animMoveEnd, this);
          delete this._proxy;
        },
        _animMoveEnd: function() {
          var c2 = this.getCenter(), z2 = this.getZoom();
          setTransform(this._proxy, this.project(c2, z2), this.getZoomScale(z2, 1));
        },
        _catchTransitionEnd: function(e2) {
          if (this._animatingZoom && e2.propertyName.indexOf("transform") >= 0) {
            this._onZoomTransitionEnd();
          }
        },
        _nothingToAnimate: function() {
          return !this._container.getElementsByClassName("leaflet-zoom-animated").length;
        },
        _tryAnimatedZoom: function(center, zoom2, options) {
          if (this._animatingZoom) {
            return true;
          }
          options = options || {};
          if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() || Math.abs(zoom2 - this._zoom) > this.options.zoomAnimationThreshold) {
            return false;
          }
          var scale2 = this.getZoomScale(zoom2), offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale2);
          if (options.animate !== true && !this.getSize().contains(offset)) {
            return false;
          }
          requestAnimFrame(function() {
            this._moveStart(true, options.noMoveStart || false)._animateZoom(center, zoom2, true);
          }, this);
          return true;
        },
        _animateZoom: function(center, zoom2, startAnim, noUpdate) {
          if (!this._mapPane) {
            return;
          }
          if (startAnim) {
            this._animatingZoom = true;
            this._animateToCenter = center;
            this._animateToZoom = zoom2;
            addClass(this._mapPane, "leaflet-zoom-anim");
          }
          this.fire("zoomanim", {
            center,
            zoom: zoom2,
            noUpdate
          });
          if (!this._tempFireZoomEvent) {
            this._tempFireZoomEvent = this._zoom !== this._animateToZoom;
          }
          this._move(this._animateToCenter, this._animateToZoom, void 0, true);
          setTimeout(bind(this._onZoomTransitionEnd, this), 250);
        },
        _onZoomTransitionEnd: function() {
          if (!this._animatingZoom) {
            return;
          }
          if (this._mapPane) {
            removeClass(this._mapPane, "leaflet-zoom-anim");
          }
          this._animatingZoom = false;
          this._move(this._animateToCenter, this._animateToZoom, void 0, true);
          if (this._tempFireZoomEvent) {
            this.fire("zoom");
          }
          delete this._tempFireZoomEvent;
          this.fire("move");
          this._moveEnd(true);
        }
      });
      function createMap(id, options) {
        return new Map2(id, options);
      }
      var Control = Class.extend({
        // @section
        // @aka Control Options
        options: {
          // @option position: String = 'topright'
          // The position of the control (one of the map corners). Possible values are `'topleft'`,
          // `'topright'`, `'bottomleft'` or `'bottomright'`
          position: "topright"
        },
        initialize: function(options) {
          setOptions(this, options);
        },
        /* @section
         * Classes extending L.Control will inherit the following methods:
         *
         * @method getPosition: string
         * Returns the position of the control.
         */
        getPosition: function() {
          return this.options.position;
        },
        // @method setPosition(position: string): this
        // Sets the position of the control.
        setPosition: function(position) {
          var map2 = this._map;
          if (map2) {
            map2.removeControl(this);
          }
          this.options.position = position;
          if (map2) {
            map2.addControl(this);
          }
          return this;
        },
        // @method getContainer: HTMLElement
        // Returns the HTMLElement that contains the control.
        getContainer: function() {
          return this._container;
        },
        // @method addTo(map: Map): this
        // Adds the control to the given map.
        addTo: function(map2) {
          this.remove();
          this._map = map2;
          var container = this._container = this.onAdd(map2), pos = this.getPosition(), corner = map2._controlCorners[pos];
          addClass(container, "leaflet-control");
          if (pos.indexOf("bottom") !== -1) {
            corner.insertBefore(container, corner.firstChild);
          } else {
            corner.appendChild(container);
          }
          this._map.on("unload", this.remove, this);
          return this;
        },
        // @method remove: this
        // Removes the control from the map it is currently active on.
        remove: function() {
          if (!this._map) {
            return this;
          }
          remove(this._container);
          if (this.onRemove) {
            this.onRemove(this._map);
          }
          this._map.off("unload", this.remove, this);
          this._map = null;
          return this;
        },
        _refocusOnMap: function(e2) {
          if (this._map && e2 && e2.screenX > 0 && e2.screenY > 0) {
            this._map.getContainer().focus();
          }
        }
      });
      var control2 = function(options) {
        return new Control(options);
      };
      Map2.include({
        // @method addControl(control: Control): this
        // Adds the given control to the map
        addControl: function(control3) {
          control3.addTo(this);
          return this;
        },
        // @method removeControl(control: Control): this
        // Removes the given control from the map
        removeControl: function(control3) {
          control3.remove();
          return this;
        },
        _initControlPos: function() {
          var corners = this._controlCorners = {}, l2 = "leaflet-", container = this._controlContainer = create$1("div", l2 + "control-container", this._container);
          function createCorner(vSide, hSide) {
            var className = l2 + vSide + " " + l2 + hSide;
            corners[vSide + hSide] = create$1("div", className, container);
          }
          createCorner("top", "left");
          createCorner("top", "right");
          createCorner("bottom", "left");
          createCorner("bottom", "right");
        },
        _clearControlPos: function() {
          for (var i2 in this._controlCorners) {
            remove(this._controlCorners[i2]);
          }
          remove(this._controlContainer);
          delete this._controlCorners;
          delete this._controlContainer;
        }
      });
      var Layers = Control.extend({
        // @section
        // @aka Control.Layers options
        options: {
          // @option collapsed: Boolean = true
          // If `true`, the control will be collapsed into an icon and expanded on mouse hover, touch, or keyboard activation.
          collapsed: true,
          position: "topright",
          // @option autoZIndex: Boolean = true
          // If `true`, the control will assign zIndexes in increasing order to all of its layers so that the order is preserved when switching them on/off.
          autoZIndex: true,
          // @option hideSingleBase: Boolean = false
          // If `true`, the base layers in the control will be hidden when there is only one.
          hideSingleBase: false,
          // @option sortLayers: Boolean = false
          // Whether to sort the layers. When `false`, layers will keep the order
          // in which they were added to the control.
          sortLayers: false,
          // @option sortFunction: Function = *
          // A [compare function](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)
          // that will be used for sorting the layers, when `sortLayers` is `true`.
          // The function receives both the `L.Layer` instances and their names, as in
          // `sortFunction(layerA, layerB, nameA, nameB)`.
          // By default, it sorts layers alphabetically by their name.
          sortFunction: function(layerA, layerB, nameA, nameB) {
            return nameA < nameB ? -1 : nameB < nameA ? 1 : 0;
          }
        },
        initialize: function(baseLayers, overlays, options) {
          setOptions(this, options);
          this._layerControlInputs = [];
          this._layers = [];
          this._lastZIndex = 0;
          this._handlingClick = false;
          this._preventClick = false;
          for (var i2 in baseLayers) {
            this._addLayer(baseLayers[i2], i2);
          }
          for (i2 in overlays) {
            this._addLayer(overlays[i2], i2, true);
          }
        },
        onAdd: function(map2) {
          this._initLayout();
          this._update();
          this._map = map2;
          map2.on("zoomend", this._checkDisabledLayers, this);
          for (var i2 = 0; i2 < this._layers.length; i2++) {
            this._layers[i2].layer.on("add remove", this._onLayerChange, this);
          }
          return this._container;
        },
        addTo: function(map2) {
          Control.prototype.addTo.call(this, map2);
          return this._expandIfNotCollapsed();
        },
        onRemove: function() {
          this._map.off("zoomend", this._checkDisabledLayers, this);
          for (var i2 = 0; i2 < this._layers.length; i2++) {
            this._layers[i2].layer.off("add remove", this._onLayerChange, this);
          }
        },
        // @method addBaseLayer(layer: Layer, name: String): this
        // Adds a base layer (radio button entry) with the given name to the control.
        addBaseLayer: function(layer, name) {
          this._addLayer(layer, name);
          return this._map ? this._update() : this;
        },
        // @method addOverlay(layer: Layer, name: String): this
        // Adds an overlay (checkbox entry) with the given name to the control.
        addOverlay: function(layer, name) {
          this._addLayer(layer, name, true);
          return this._map ? this._update() : this;
        },
        // @method removeLayer(layer: Layer): this
        // Remove the given layer from the control.
        removeLayer: function(layer) {
          layer.off("add remove", this._onLayerChange, this);
          var obj = this._getLayer(stamp(layer));
          if (obj) {
            this._layers.splice(this._layers.indexOf(obj), 1);
          }
          return this._map ? this._update() : this;
        },
        // @method expand(): this
        // Expand the control container if collapsed.
        expand: function() {
          addClass(this._container, "leaflet-control-layers-expanded");
          this._section.style.height = null;
          var acceptableHeight = this._map.getSize().y - (this._container.offsetTop + 50);
          if (acceptableHeight < this._section.clientHeight) {
            addClass(this._section, "leaflet-control-layers-scrollbar");
            this._section.style.height = acceptableHeight + "px";
          } else {
            removeClass(this._section, "leaflet-control-layers-scrollbar");
          }
          this._checkDisabledLayers();
          return this;
        },
        // @method collapse(): this
        // Collapse the control container if expanded.
        collapse: function() {
          removeClass(this._container, "leaflet-control-layers-expanded");
          return this;
        },
        _initLayout: function() {
          var className = "leaflet-control-layers", container = this._container = create$1("div", className), collapsed = this.options.collapsed;
          container.setAttribute("aria-haspopup", true);
          disableClickPropagation(container);
          disableScrollPropagation(container);
          var section = this._section = create$1("section", className + "-list");
          if (collapsed) {
            this._map.on("click", this.collapse, this);
            on(container, {
              mouseenter: this._expandSafely,
              mouseleave: this.collapse
            }, this);
          }
          var link = this._layersLink = create$1("a", className + "-toggle", container);
          link.href = "#";
          link.title = "Layers";
          link.setAttribute("role", "button");
          on(link, {
            keydown: function(e2) {
              if (e2.keyCode === 13) {
                this._expandSafely();
              }
            },
            // Certain screen readers intercept the key event and instead send a click event
            click: function(e2) {
              preventDefault(e2);
              this._expandSafely();
            }
          }, this);
          if (!collapsed) {
            this.expand();
          }
          this._baseLayersList = create$1("div", className + "-base", section);
          this._separator = create$1("div", className + "-separator", section);
          this._overlaysList = create$1("div", className + "-overlays", section);
          container.appendChild(section);
        },
        _getLayer: function(id) {
          for (var i2 = 0; i2 < this._layers.length; i2++) {
            if (this._layers[i2] && stamp(this._layers[i2].layer) === id) {
              return this._layers[i2];
            }
          }
        },
        _addLayer: function(layer, name, overlay) {
          if (this._map) {
            layer.on("add remove", this._onLayerChange, this);
          }
          this._layers.push({
            layer,
            name,
            overlay
          });
          if (this.options.sortLayers) {
            this._layers.sort(bind(function(a2, b2) {
              return this.options.sortFunction(a2.layer, b2.layer, a2.name, b2.name);
            }, this));
          }
          if (this.options.autoZIndex && layer.setZIndex) {
            this._lastZIndex++;
            layer.setZIndex(this._lastZIndex);
          }
          this._expandIfNotCollapsed();
        },
        _update: function() {
          if (!this._container) {
            return this;
          }
          empty(this._baseLayersList);
          empty(this._overlaysList);
          this._layerControlInputs = [];
          var baseLayersPresent, overlaysPresent, i2, obj, baseLayersCount = 0;
          for (i2 = 0; i2 < this._layers.length; i2++) {
            obj = this._layers[i2];
            this._addItem(obj);
            overlaysPresent = overlaysPresent || obj.overlay;
            baseLayersPresent = baseLayersPresent || !obj.overlay;
            baseLayersCount += !obj.overlay ? 1 : 0;
          }
          if (this.options.hideSingleBase) {
            baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
            this._baseLayersList.style.display = baseLayersPresent ? "" : "none";
          }
          this._separator.style.display = overlaysPresent && baseLayersPresent ? "" : "none";
          return this;
        },
        _onLayerChange: function(e2) {
          if (!this._handlingClick) {
            this._update();
          }
          var obj = this._getLayer(stamp(e2.target));
          var type = obj.overlay ? e2.type === "add" ? "overlayadd" : "overlayremove" : e2.type === "add" ? "baselayerchange" : null;
          if (type) {
            this._map.fire(type, obj);
          }
        },
        // IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see https://stackoverflow.com/a/119079)
        _createRadioElement: function(name, checked) {
          var radioHtml = '<input type="radio" class="leaflet-control-layers-selector" name="' + name + '"' + (checked ? ' checked="checked"' : "") + "/>";
          var radioFragment = document.createElement("div");
          radioFragment.innerHTML = radioHtml;
          return radioFragment.firstChild;
        },
        _addItem: function(obj) {
          var label = document.createElement("label"), checked = this._map.hasLayer(obj.layer), input;
          if (obj.overlay) {
            input = document.createElement("input");
            input.type = "checkbox";
            input.className = "leaflet-control-layers-selector";
            input.defaultChecked = checked;
          } else {
            input = this._createRadioElement("leaflet-base-layers_" + stamp(this), checked);
          }
          this._layerControlInputs.push(input);
          input.layerId = stamp(obj.layer);
          on(input, "click", this._onInputClick, this);
          var name = document.createElement("span");
          name.innerHTML = " " + obj.name;
          var holder = document.createElement("span");
          label.appendChild(holder);
          holder.appendChild(input);
          holder.appendChild(name);
          var container = obj.overlay ? this._overlaysList : this._baseLayersList;
          container.appendChild(label);
          this._checkDisabledLayers();
          return label;
        },
        _onInputClick: function() {
          if (this._preventClick) {
            return;
          }
          var inputs = this._layerControlInputs, input, layer;
          var addedLayers = [], removedLayers = [];
          this._handlingClick = true;
          for (var i2 = inputs.length - 1; i2 >= 0; i2--) {
            input = inputs[i2];
            layer = this._getLayer(input.layerId).layer;
            if (input.checked) {
              addedLayers.push(layer);
            } else if (!input.checked) {
              removedLayers.push(layer);
            }
          }
          for (i2 = 0; i2 < removedLayers.length; i2++) {
            if (this._map.hasLayer(removedLayers[i2])) {
              this._map.removeLayer(removedLayers[i2]);
            }
          }
          for (i2 = 0; i2 < addedLayers.length; i2++) {
            if (!this._map.hasLayer(addedLayers[i2])) {
              this._map.addLayer(addedLayers[i2]);
            }
          }
          this._handlingClick = false;
          this._refocusOnMap();
        },
        _checkDisabledLayers: function() {
          var inputs = this._layerControlInputs, input, layer, zoom2 = this._map.getZoom();
          for (var i2 = inputs.length - 1; i2 >= 0; i2--) {
            input = inputs[i2];
            layer = this._getLayer(input.layerId).layer;
            input.disabled = layer.options.minZoom !== void 0 && zoom2 < layer.options.minZoom || layer.options.maxZoom !== void 0 && zoom2 > layer.options.maxZoom;
          }
        },
        _expandIfNotCollapsed: function() {
          if (this._map && !this.options.collapsed) {
            this.expand();
          }
          return this;
        },
        _expandSafely: function() {
          var section = this._section;
          this._preventClick = true;
          on(section, "click", preventDefault);
          this.expand();
          var that = this;
          setTimeout(function() {
            off(section, "click", preventDefault);
            that._preventClick = false;
          });
        }
      });
      var layers = function(baseLayers, overlays, options) {
        return new Layers(baseLayers, overlays, options);
      };
      var Zoom = Control.extend({
        // @section
        // @aka Control.Zoom options
        options: {
          position: "topleft",
          // @option zoomInText: String = '<span aria-hidden="true">+</span>'
          // The text set on the 'zoom in' button.
          zoomInText: '<span aria-hidden="true">+</span>',
          // @option zoomInTitle: String = 'Zoom in'
          // The title set on the 'zoom in' button.
          zoomInTitle: "Zoom in",
          // @option zoomOutText: String = '<span aria-hidden="true">&#x2212;</span>'
          // The text set on the 'zoom out' button.
          zoomOutText: '<span aria-hidden="true">&#x2212;</span>',
          // @option zoomOutTitle: String = 'Zoom out'
          // The title set on the 'zoom out' button.
          zoomOutTitle: "Zoom out"
        },
        onAdd: function(map2) {
          var zoomName = "leaflet-control-zoom", container = create$1("div", zoomName + " leaflet-bar"), options = this.options;
          this._zoomInButton = this._createButton(
            options.zoomInText,
            options.zoomInTitle,
            zoomName + "-in",
            container,
            this._zoomIn
          );
          this._zoomOutButton = this._createButton(
            options.zoomOutText,
            options.zoomOutTitle,
            zoomName + "-out",
            container,
            this._zoomOut
          );
          this._updateDisabled();
          map2.on("zoomend zoomlevelschange", this._updateDisabled, this);
          return container;
        },
        onRemove: function(map2) {
          map2.off("zoomend zoomlevelschange", this._updateDisabled, this);
        },
        disable: function() {
          this._disabled = true;
          this._updateDisabled();
          return this;
        },
        enable: function() {
          this._disabled = false;
          this._updateDisabled();
          return this;
        },
        _zoomIn: function(e2) {
          if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
            this._map.zoomIn(this._map.options.zoomDelta * (e2.shiftKey ? 3 : 1));
          }
        },
        _zoomOut: function(e2) {
          if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
            this._map.zoomOut(this._map.options.zoomDelta * (e2.shiftKey ? 3 : 1));
          }
        },
        _createButton: function(html, title, className, container, fn) {
          var link = create$1("a", className, container);
          link.innerHTML = html;
          link.href = "#";
          link.title = title;
          link.setAttribute("role", "button");
          link.setAttribute("aria-label", title);
          disableClickPropagation(link);
          on(link, "click", stop);
          on(link, "click", fn, this);
          on(link, "click", this._refocusOnMap, this);
          return link;
        },
        _updateDisabled: function() {
          var map2 = this._map, className = "leaflet-disabled";
          removeClass(this._zoomInButton, className);
          removeClass(this._zoomOutButton, className);
          this._zoomInButton.setAttribute("aria-disabled", "false");
          this._zoomOutButton.setAttribute("aria-disabled", "false");
          if (this._disabled || map2._zoom === map2.getMinZoom()) {
            addClass(this._zoomOutButton, className);
            this._zoomOutButton.setAttribute("aria-disabled", "true");
          }
          if (this._disabled || map2._zoom === map2.getMaxZoom()) {
            addClass(this._zoomInButton, className);
            this._zoomInButton.setAttribute("aria-disabled", "true");
          }
        }
      });
      Map2.mergeOptions({
        zoomControl: true
      });
      Map2.addInitHook(function() {
        if (this.options.zoomControl) {
          this.zoomControl = new Zoom();
          this.addControl(this.zoomControl);
        }
      });
      var zoom = function(options) {
        return new Zoom(options);
      };
      var Scale = Control.extend({
        // @section
        // @aka Control.Scale options
        options: {
          position: "bottomleft",
          // @option maxWidth: Number = 100
          // Maximum width of the control in pixels. The width is set dynamically to show round values (e.g. 100, 200, 500).
          maxWidth: 100,
          // @option metric: Boolean = True
          // Whether to show the metric scale line (m/km).
          metric: true,
          // @option imperial: Boolean = True
          // Whether to show the imperial scale line (mi/ft).
          imperial: true
          // @option updateWhenIdle: Boolean = false
          // If `true`, the control is updated on [`moveend`](#map-moveend), otherwise it's always up-to-date (updated on [`move`](#map-move)).
        },
        onAdd: function(map2) {
          var className = "leaflet-control-scale", container = create$1("div", className), options = this.options;
          this._addScales(options, className + "-line", container);
          map2.on(options.updateWhenIdle ? "moveend" : "move", this._update, this);
          map2.whenReady(this._update, this);
          return container;
        },
        onRemove: function(map2) {
          map2.off(this.options.updateWhenIdle ? "moveend" : "move", this._update, this);
        },
        _addScales: function(options, className, container) {
          if (options.metric) {
            this._mScale = create$1("div", className, container);
          }
          if (options.imperial) {
            this._iScale = create$1("div", className, container);
          }
        },
        _update: function() {
          var map2 = this._map, y2 = map2.getSize().y / 2;
          var maxMeters = map2.distance(
            map2.containerPointToLatLng([0, y2]),
            map2.containerPointToLatLng([this.options.maxWidth, y2])
          );
          this._updateScales(maxMeters);
        },
        _updateScales: function(maxMeters) {
          if (this.options.metric && maxMeters) {
            this._updateMetric(maxMeters);
          }
          if (this.options.imperial && maxMeters) {
            this._updateImperial(maxMeters);
          }
        },
        _updateMetric: function(maxMeters) {
          var meters = this._getRoundNum(maxMeters), label = meters < 1e3 ? meters + " m" : meters / 1e3 + " km";
          this._updateScale(this._mScale, label, meters / maxMeters);
        },
        _updateImperial: function(maxMeters) {
          var maxFeet = maxMeters * 3.2808399, maxMiles, miles, feet;
          if (maxFeet > 5280) {
            maxMiles = maxFeet / 5280;
            miles = this._getRoundNum(maxMiles);
            this._updateScale(this._iScale, miles + " mi", miles / maxMiles);
          } else {
            feet = this._getRoundNum(maxFeet);
            this._updateScale(this._iScale, feet + " ft", feet / maxFeet);
          }
        },
        _updateScale: function(scale2, text, ratio) {
          scale2.style.width = Math.round(this.options.maxWidth * ratio) + "px";
          scale2.innerHTML = text;
        },
        _getRoundNum: function(num) {
          var pow10 = Math.pow(10, (Math.floor(num) + "").length - 1), d2 = num / pow10;
          d2 = d2 >= 10 ? 10 : d2 >= 5 ? 5 : d2 >= 3 ? 3 : d2 >= 2 ? 2 : 1;
          return pow10 * d2;
        }
      });
      var scale = function(options) {
        return new Scale(options);
      };
      var ukrainianFlag = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"/><path fill="#FFD500" d="M0 4h12v3H0z"/><path fill="#E0BC00" d="M0 7h12v1H0z"/></svg>';
      var Attribution = Control.extend({
        // @section
        // @aka Control.Attribution options
        options: {
          position: "bottomright",
          // @option prefix: String|false = 'Leaflet'
          // The HTML text shown before the attributions. Pass `false` to disable.
          prefix: '<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">' + (Browser.inlineSvg ? ukrainianFlag + " " : "") + "Leaflet</a>"
        },
        initialize: function(options) {
          setOptions(this, options);
          this._attributions = {};
        },
        onAdd: function(map2) {
          map2.attributionControl = this;
          this._container = create$1("div", "leaflet-control-attribution");
          disableClickPropagation(this._container);
          for (var i2 in map2._layers) {
            if (map2._layers[i2].getAttribution) {
              this.addAttribution(map2._layers[i2].getAttribution());
            }
          }
          this._update();
          map2.on("layeradd", this._addAttribution, this);
          return this._container;
        },
        onRemove: function(map2) {
          map2.off("layeradd", this._addAttribution, this);
        },
        _addAttribution: function(ev) {
          if (ev.layer.getAttribution) {
            this.addAttribution(ev.layer.getAttribution());
            ev.layer.once("remove", function() {
              this.removeAttribution(ev.layer.getAttribution());
            }, this);
          }
        },
        // @method setPrefix(prefix: String|false): this
        // The HTML text shown before the attributions. Pass `false` to disable.
        setPrefix: function(prefix) {
          this.options.prefix = prefix;
          this._update();
          return this;
        },
        // @method addAttribution(text: String): this
        // Adds an attribution text (e.g. `'&copy; OpenStreetMap contributors'`).
        addAttribution: function(text) {
          if (!text) {
            return this;
          }
          if (!this._attributions[text]) {
            this._attributions[text] = 0;
          }
          this._attributions[text]++;
          this._update();
          return this;
        },
        // @method removeAttribution(text: String): this
        // Removes an attribution text.
        removeAttribution: function(text) {
          if (!text) {
            return this;
          }
          if (this._attributions[text]) {
            this._attributions[text]--;
            this._update();
          }
          return this;
        },
        _update: function() {
          if (!this._map) {
            return;
          }
          var attribs = [];
          for (var i2 in this._attributions) {
            if (this._attributions[i2]) {
              attribs.push(i2);
            }
          }
          var prefixAndAttribs = [];
          if (this.options.prefix) {
            prefixAndAttribs.push(this.options.prefix);
          }
          if (attribs.length) {
            prefixAndAttribs.push(attribs.join(", "));
          }
          this._container.innerHTML = prefixAndAttribs.join(' <span aria-hidden="true">|</span> ');
        }
      });
      Map2.mergeOptions({
        attributionControl: true
      });
      Map2.addInitHook(function() {
        if (this.options.attributionControl) {
          new Attribution().addTo(this);
        }
      });
      var attribution = function(options) {
        return new Attribution(options);
      };
      Control.Layers = Layers;
      Control.Zoom = Zoom;
      Control.Scale = Scale;
      Control.Attribution = Attribution;
      control2.layers = layers;
      control2.zoom = zoom;
      control2.scale = scale;
      control2.attribution = attribution;
      var Handler = Class.extend({
        initialize: function(map2) {
          this._map = map2;
        },
        // @method enable(): this
        // Enables the handler
        enable: function() {
          if (this._enabled) {
            return this;
          }
          this._enabled = true;
          this.addHooks();
          return this;
        },
        // @method disable(): this
        // Disables the handler
        disable: function() {
          if (!this._enabled) {
            return this;
          }
          this._enabled = false;
          this.removeHooks();
          return this;
        },
        // @method enabled(): Boolean
        // Returns `true` if the handler is enabled
        enabled: function() {
          return !!this._enabled;
        }
        // @section Extension methods
        // Classes inheriting from `Handler` must implement the two following methods:
        // @method addHooks()
        // Called when the handler is enabled, should add event hooks.
        // @method removeHooks()
        // Called when the handler is disabled, should remove the event hooks added previously.
      });
      Handler.addTo = function(map2, name) {
        map2.addHandler(name, this);
        return this;
      };
      var Mixin = { Events };
      var START = Browser.touch ? "touchstart mousedown" : "mousedown";
      var Draggable = Evented.extend({
        options: {
          // @section
          // @aka Draggable options
          // @option clickTolerance: Number = 3
          // The max number of pixels a user can shift the mouse pointer during a click
          // for it to be considered a valid click (as opposed to a mouse drag).
          clickTolerance: 3
        },
        // @constructor L.Draggable(el: HTMLElement, dragHandle?: HTMLElement, preventOutline?: Boolean, options?: Draggable options)
        // Creates a `Draggable` object for moving `el` when you start dragging the `dragHandle` element (equals `el` itself by default).
        initialize: function(element, dragStartTarget, preventOutline2, options) {
          setOptions(this, options);
          this._element = element;
          this._dragStartTarget = dragStartTarget || element;
          this._preventOutline = preventOutline2;
        },
        // @method enable()
        // Enables the dragging ability
        enable: function() {
          if (this._enabled) {
            return;
          }
          on(this._dragStartTarget, START, this._onDown, this);
          this._enabled = true;
        },
        // @method disable()
        // Disables the dragging ability
        disable: function() {
          if (!this._enabled) {
            return;
          }
          if (Draggable._dragging === this) {
            this.finishDrag(true);
          }
          off(this._dragStartTarget, START, this._onDown, this);
          this._enabled = false;
          this._moved = false;
        },
        _onDown: function(e2) {
          if (!this._enabled) {
            return;
          }
          this._moved = false;
          if (hasClass(this._element, "leaflet-zoom-anim")) {
            return;
          }
          if (e2.touches && e2.touches.length !== 1) {
            if (Draggable._dragging === this) {
              this.finishDrag();
            }
            return;
          }
          if (Draggable._dragging || e2.shiftKey || e2.which !== 1 && e2.button !== 1 && !e2.touches) {
            return;
          }
          Draggable._dragging = this;
          if (this._preventOutline) {
            preventOutline(this._element);
          }
          disableImageDrag();
          disableTextSelection();
          if (this._moving) {
            return;
          }
          this.fire("down");
          var first = e2.touches ? e2.touches[0] : e2, sizedParent = getSizedParentNode(this._element);
          this._startPoint = new Point(first.clientX, first.clientY);
          this._startPos = getPosition(this._element);
          this._parentScale = getScale(sizedParent);
          var mouseevent = e2.type === "mousedown";
          on(document, mouseevent ? "mousemove" : "touchmove", this._onMove, this);
          on(document, mouseevent ? "mouseup" : "touchend touchcancel", this._onUp, this);
        },
        _onMove: function(e2) {
          if (!this._enabled) {
            return;
          }
          if (e2.touches && e2.touches.length > 1) {
            this._moved = true;
            return;
          }
          var first = e2.touches && e2.touches.length === 1 ? e2.touches[0] : e2, offset = new Point(first.clientX, first.clientY)._subtract(this._startPoint);
          if (!offset.x && !offset.y) {
            return;
          }
          if (Math.abs(offset.x) + Math.abs(offset.y) < this.options.clickTolerance) {
            return;
          }
          offset.x /= this._parentScale.x;
          offset.y /= this._parentScale.y;
          preventDefault(e2);
          if (!this._moved) {
            this.fire("dragstart");
            this._moved = true;
            addClass(document.body, "leaflet-dragging");
            this._lastTarget = e2.target || e2.srcElement;
            if (window.SVGElementInstance && this._lastTarget instanceof window.SVGElementInstance) {
              this._lastTarget = this._lastTarget.correspondingUseElement;
            }
            addClass(this._lastTarget, "leaflet-drag-target");
          }
          this._newPos = this._startPos.add(offset);
          this._moving = true;
          this._lastEvent = e2;
          this._updatePosition();
        },
        _updatePosition: function() {
          var e2 = { originalEvent: this._lastEvent };
          this.fire("predrag", e2);
          setPosition(this._element, this._newPos);
          this.fire("drag", e2);
        },
        _onUp: function() {
          if (!this._enabled) {
            return;
          }
          this.finishDrag();
        },
        finishDrag: function(noInertia) {
          removeClass(document.body, "leaflet-dragging");
          if (this._lastTarget) {
            removeClass(this._lastTarget, "leaflet-drag-target");
            this._lastTarget = null;
          }
          off(document, "mousemove touchmove", this._onMove, this);
          off(document, "mouseup touchend touchcancel", this._onUp, this);
          enableImageDrag();
          enableTextSelection();
          var fireDragend = this._moved && this._moving;
          this._moving = false;
          Draggable._dragging = false;
          if (fireDragend) {
            this.fire("dragend", {
              noInertia,
              distance: this._newPos.distanceTo(this._startPos)
            });
          }
        }
      });
      function clipPolygon(points, bounds, round) {
        var clippedPoints, edges = [1, 4, 2, 8], i2, j2, k2, a2, b2, len, edge2, p2;
        for (i2 = 0, len = points.length; i2 < len; i2++) {
          points[i2]._code = _getBitCode(points[i2], bounds);
        }
        for (k2 = 0; k2 < 4; k2++) {
          edge2 = edges[k2];
          clippedPoints = [];
          for (i2 = 0, len = points.length, j2 = len - 1; i2 < len; j2 = i2++) {
            a2 = points[i2];
            b2 = points[j2];
            if (!(a2._code & edge2)) {
              if (b2._code & edge2) {
                p2 = _getEdgeIntersection(b2, a2, edge2, bounds, round);
                p2._code = _getBitCode(p2, bounds);
                clippedPoints.push(p2);
              }
              clippedPoints.push(a2);
            } else if (!(b2._code & edge2)) {
              p2 = _getEdgeIntersection(b2, a2, edge2, bounds, round);
              p2._code = _getBitCode(p2, bounds);
              clippedPoints.push(p2);
            }
          }
          points = clippedPoints;
        }
        return points;
      }
      function polygonCenter(latlngs, crs) {
        var i2, j2, p1, p2, f2, area, x2, y2, center;
        if (!latlngs || latlngs.length === 0) {
          throw new Error("latlngs not passed");
        }
        if (!isFlat(latlngs)) {
          console.warn("latlngs are not flat! Only the first ring will be used");
          latlngs = latlngs[0];
        }
        var centroidLatLng = toLatLng([0, 0]);
        var bounds = toLatLngBounds(latlngs);
        var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
        if (areaBounds < 1700) {
          centroidLatLng = centroid(latlngs);
        }
        var len = latlngs.length;
        var points = [];
        for (i2 = 0; i2 < len; i2++) {
          var latlng = toLatLng(latlngs[i2]);
          points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
        }
        area = x2 = y2 = 0;
        for (i2 = 0, j2 = len - 1; i2 < len; j2 = i2++) {
          p1 = points[i2];
          p2 = points[j2];
          f2 = p1.y * p2.x - p2.y * p1.x;
          x2 += (p1.x + p2.x) * f2;
          y2 += (p1.y + p2.y) * f2;
          area += f2 * 3;
        }
        if (area === 0) {
          center = points[0];
        } else {
          center = [x2 / area, y2 / area];
        }
        var latlngCenter = crs.unproject(toPoint(center));
        return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
      }
      function centroid(coords) {
        var latSum = 0;
        var lngSum = 0;
        var len = 0;
        for (var i2 = 0; i2 < coords.length; i2++) {
          var latlng = toLatLng(coords[i2]);
          latSum += latlng.lat;
          lngSum += latlng.lng;
          len++;
        }
        return toLatLng([latSum / len, lngSum / len]);
      }
      var PolyUtil = {
        __proto__: null,
        clipPolygon,
        polygonCenter,
        centroid
      };
      function simplify(points, tolerance) {
        if (!tolerance || !points.length) {
          return points.slice();
        }
        var sqTolerance = tolerance * tolerance;
        points = _reducePoints(points, sqTolerance);
        points = _simplifyDP(points, sqTolerance);
        return points;
      }
      function pointToSegmentDistance(p2, p1, p22) {
        return Math.sqrt(_sqClosestPointOnSegment(p2, p1, p22, true));
      }
      function closestPointOnSegment(p2, p1, p22) {
        return _sqClosestPointOnSegment(p2, p1, p22);
      }
      function _simplifyDP(points, sqTolerance) {
        var len = points.length, ArrayConstructor = typeof Uint8Array !== "undefined" ? Uint8Array : Array, markers = new ArrayConstructor(len);
        markers[0] = markers[len - 1] = 1;
        _simplifyDPStep(points, markers, sqTolerance, 0, len - 1);
        var i2, newPoints = [];
        for (i2 = 0; i2 < len; i2++) {
          if (markers[i2]) {
            newPoints.push(points[i2]);
          }
        }
        return newPoints;
      }
      function _simplifyDPStep(points, markers, sqTolerance, first, last) {
        var maxSqDist = 0, index2, i2, sqDist;
        for (i2 = first + 1; i2 <= last - 1; i2++) {
          sqDist = _sqClosestPointOnSegment(points[i2], points[first], points[last], true);
          if (sqDist > maxSqDist) {
            index2 = i2;
            maxSqDist = sqDist;
          }
        }
        if (maxSqDist > sqTolerance) {
          markers[index2] = 1;
          _simplifyDPStep(points, markers, sqTolerance, first, index2);
          _simplifyDPStep(points, markers, sqTolerance, index2, last);
        }
      }
      function _reducePoints(points, sqTolerance) {
        var reducedPoints = [points[0]];
        for (var i2 = 1, prev = 0, len = points.length; i2 < len; i2++) {
          if (_sqDist(points[i2], points[prev]) > sqTolerance) {
            reducedPoints.push(points[i2]);
            prev = i2;
          }
        }
        if (prev < len - 1) {
          reducedPoints.push(points[len - 1]);
        }
        return reducedPoints;
      }
      var _lastCode;
      function clipSegment(a2, b2, bounds, useLastCode, round) {
        var codeA = useLastCode ? _lastCode : _getBitCode(a2, bounds), codeB = _getBitCode(b2, bounds), codeOut, p2, newCode;
        _lastCode = codeB;
        while (true) {
          if (!(codeA | codeB)) {
            return [a2, b2];
          }
          if (codeA & codeB) {
            return false;
          }
          codeOut = codeA || codeB;
          p2 = _getEdgeIntersection(a2, b2, codeOut, bounds, round);
          newCode = _getBitCode(p2, bounds);
          if (codeOut === codeA) {
            a2 = p2;
            codeA = newCode;
          } else {
            b2 = p2;
            codeB = newCode;
          }
        }
      }
      function _getEdgeIntersection(a2, b2, code, bounds, round) {
        var dx = b2.x - a2.x, dy = b2.y - a2.y, min = bounds.min, max = bounds.max, x2, y2;
        if (code & 8) {
          x2 = a2.x + dx * (max.y - a2.y) / dy;
          y2 = max.y;
        } else if (code & 4) {
          x2 = a2.x + dx * (min.y - a2.y) / dy;
          y2 = min.y;
        } else if (code & 2) {
          x2 = max.x;
          y2 = a2.y + dy * (max.x - a2.x) / dx;
        } else if (code & 1) {
          x2 = min.x;
          y2 = a2.y + dy * (min.x - a2.x) / dx;
        }
        return new Point(x2, y2, round);
      }
      function _getBitCode(p2, bounds) {
        var code = 0;
        if (p2.x < bounds.min.x) {
          code |= 1;
        } else if (p2.x > bounds.max.x) {
          code |= 2;
        }
        if (p2.y < bounds.min.y) {
          code |= 4;
        } else if (p2.y > bounds.max.y) {
          code |= 8;
        }
        return code;
      }
      function _sqDist(p1, p2) {
        var dx = p2.x - p1.x, dy = p2.y - p1.y;
        return dx * dx + dy * dy;
      }
      function _sqClosestPointOnSegment(p2, p1, p22, sqDist) {
        var x2 = p1.x, y2 = p1.y, dx = p22.x - x2, dy = p22.y - y2, dot = dx * dx + dy * dy, t2;
        if (dot > 0) {
          t2 = ((p2.x - x2) * dx + (p2.y - y2) * dy) / dot;
          if (t2 > 1) {
            x2 = p22.x;
            y2 = p22.y;
          } else if (t2 > 0) {
            x2 += dx * t2;
            y2 += dy * t2;
          }
        }
        dx = p2.x - x2;
        dy = p2.y - y2;
        return sqDist ? dx * dx + dy * dy : new Point(x2, y2);
      }
      function isFlat(latlngs) {
        return !isArray(latlngs[0]) || typeof latlngs[0][0] !== "object" && typeof latlngs[0][0] !== "undefined";
      }
      function _flat(latlngs) {
        console.warn("Deprecated use of _flat, please use L.LineUtil.isFlat instead.");
        return isFlat(latlngs);
      }
      function polylineCenter(latlngs, crs) {
        var i2, halfDist, segDist, dist, p1, p2, ratio, center;
        if (!latlngs || latlngs.length === 0) {
          throw new Error("latlngs not passed");
        }
        if (!isFlat(latlngs)) {
          console.warn("latlngs are not flat! Only the first ring will be used");
          latlngs = latlngs[0];
        }
        var centroidLatLng = toLatLng([0, 0]);
        var bounds = toLatLngBounds(latlngs);
        var areaBounds = bounds.getNorthWest().distanceTo(bounds.getSouthWest()) * bounds.getNorthEast().distanceTo(bounds.getNorthWest());
        if (areaBounds < 1700) {
          centroidLatLng = centroid(latlngs);
        }
        var len = latlngs.length;
        var points = [];
        for (i2 = 0; i2 < len; i2++) {
          var latlng = toLatLng(latlngs[i2]);
          points.push(crs.project(toLatLng([latlng.lat - centroidLatLng.lat, latlng.lng - centroidLatLng.lng])));
        }
        for (i2 = 0, halfDist = 0; i2 < len - 1; i2++) {
          halfDist += points[i2].distanceTo(points[i2 + 1]) / 2;
        }
        if (halfDist === 0) {
          center = points[0];
        } else {
          for (i2 = 0, dist = 0; i2 < len - 1; i2++) {
            p1 = points[i2];
            p2 = points[i2 + 1];
            segDist = p1.distanceTo(p2);
            dist += segDist;
            if (dist > halfDist) {
              ratio = (dist - halfDist) / segDist;
              center = [
                p2.x - ratio * (p2.x - p1.x),
                p2.y - ratio * (p2.y - p1.y)
              ];
              break;
            }
          }
        }
        var latlngCenter = crs.unproject(toPoint(center));
        return toLatLng([latlngCenter.lat + centroidLatLng.lat, latlngCenter.lng + centroidLatLng.lng]);
      }
      var LineUtil = {
        __proto__: null,
        simplify,
        pointToSegmentDistance,
        closestPointOnSegment,
        clipSegment,
        _getEdgeIntersection,
        _getBitCode,
        _sqClosestPointOnSegment,
        isFlat,
        _flat,
        polylineCenter
      };
      var LonLat = {
        project: function(latlng) {
          return new Point(latlng.lng, latlng.lat);
        },
        unproject: function(point) {
          return new LatLng(point.y, point.x);
        },
        bounds: new Bounds([-180, -90], [180, 90])
      };
      var Mercator = {
        R: 6378137,
        R_MINOR: 6356752314245179e-9,
        bounds: new Bounds([-2003750834279e-5, -1549657073972e-5], [2003750834279e-5, 1876465623138e-5]),
        project: function(latlng) {
          var d2 = Math.PI / 180, r2 = this.R, y2 = latlng.lat * d2, tmp = this.R_MINOR / r2, e2 = Math.sqrt(1 - tmp * tmp), con = e2 * Math.sin(y2);
          var ts = Math.tan(Math.PI / 4 - y2 / 2) / Math.pow((1 - con) / (1 + con), e2 / 2);
          y2 = -r2 * Math.log(Math.max(ts, 1e-10));
          return new Point(latlng.lng * d2 * r2, y2);
        },
        unproject: function(point) {
          var d2 = 180 / Math.PI, r2 = this.R, tmp = this.R_MINOR / r2, e2 = Math.sqrt(1 - tmp * tmp), ts = Math.exp(-point.y / r2), phi = Math.PI / 2 - 2 * Math.atan(ts);
          for (var i2 = 0, dphi = 0.1, con; i2 < 15 && Math.abs(dphi) > 1e-7; i2++) {
            con = e2 * Math.sin(phi);
            con = Math.pow((1 - con) / (1 + con), e2 / 2);
            dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
            phi += dphi;
          }
          return new LatLng(phi * d2, point.x * d2 / r2);
        }
      };
      var index = {
        __proto__: null,
        LonLat,
        Mercator,
        SphericalMercator
      };
      var EPSG3395 = extend({}, Earth, {
        code: "EPSG:3395",
        projection: Mercator,
        transformation: function() {
          var scale2 = 0.5 / (Math.PI * Mercator.R);
          return toTransformation(scale2, 0.5, -scale2, 0.5);
        }()
      });
      var EPSG4326 = extend({}, Earth, {
        code: "EPSG:4326",
        projection: LonLat,
        transformation: toTransformation(1 / 180, 1, -1 / 180, 0.5)
      });
      var Simple = extend({}, CRS, {
        projection: LonLat,
        transformation: toTransformation(1, 0, -1, 0),
        scale: function(zoom2) {
          return Math.pow(2, zoom2);
        },
        zoom: function(scale2) {
          return Math.log(scale2) / Math.LN2;
        },
        distance: function(latlng1, latlng2) {
          var dx = latlng2.lng - latlng1.lng, dy = latlng2.lat - latlng1.lat;
          return Math.sqrt(dx * dx + dy * dy);
        },
        infinite: true
      });
      CRS.Earth = Earth;
      CRS.EPSG3395 = EPSG3395;
      CRS.EPSG3857 = EPSG3857;
      CRS.EPSG900913 = EPSG900913;
      CRS.EPSG4326 = EPSG4326;
      CRS.Simple = Simple;
      var Layer = Evented.extend({
        // Classes extending `L.Layer` will inherit the following options:
        options: {
          // @option pane: String = 'overlayPane'
          // By default the layer will be added to the map's [overlay pane](#map-overlaypane). Overriding this option will cause the layer to be placed on another pane by default.
          pane: "overlayPane",
          // @option attribution: String = null
          // String to be shown in the attribution control, e.g. "© OpenStreetMap contributors". It describes the layer data and is often a legal obligation towards copyright holders and tile providers.
          attribution: null,
          bubblingMouseEvents: true
        },
        /* @section
         * Classes extending `L.Layer` will inherit the following methods:
         *
         * @method addTo(map: Map|LayerGroup): this
         * Adds the layer to the given map or layer group.
         */
        addTo: function(map2) {
          map2.addLayer(this);
          return this;
        },
        // @method remove: this
        // Removes the layer from the map it is currently active on.
        remove: function() {
          return this.removeFrom(this._map || this._mapToAdd);
        },
        // @method removeFrom(map: Map): this
        // Removes the layer from the given map
        //
        // @alternative
        // @method removeFrom(group: LayerGroup): this
        // Removes the layer from the given `LayerGroup`
        removeFrom: function(obj) {
          if (obj) {
            obj.removeLayer(this);
          }
          return this;
        },
        // @method getPane(name? : String): HTMLElement
        // Returns the `HTMLElement` representing the named pane on the map. If `name` is omitted, returns the pane for this layer.
        getPane: function(name) {
          return this._map.getPane(name ? this.options[name] || name : this.options.pane);
        },
        addInteractiveTarget: function(targetEl) {
          this._map._targets[stamp(targetEl)] = this;
          return this;
        },
        removeInteractiveTarget: function(targetEl) {
          delete this._map._targets[stamp(targetEl)];
          return this;
        },
        // @method getAttribution: String
        // Used by the `attribution control`, returns the [attribution option](#gridlayer-attribution).
        getAttribution: function() {
          return this.options.attribution;
        },
        _layerAdd: function(e2) {
          var map2 = e2.target;
          if (!map2.hasLayer(this)) {
            return;
          }
          this._map = map2;
          this._zoomAnimated = map2._zoomAnimated;
          if (this.getEvents) {
            var events = this.getEvents();
            map2.on(events, this);
            this.once("remove", function() {
              map2.off(events, this);
            }, this);
          }
          this.onAdd(map2);
          this.fire("add");
          map2.fire("layeradd", { layer: this });
        }
      });
      Map2.include({
        // @method addLayer(layer: Layer): this
        // Adds the given layer to the map
        addLayer: function(layer) {
          if (!layer._layerAdd) {
            throw new Error("The provided object is not a Layer.");
          }
          var id = stamp(layer);
          if (this._layers[id]) {
            return this;
          }
          this._layers[id] = layer;
          layer._mapToAdd = this;
          if (layer.beforeAdd) {
            layer.beforeAdd(this);
          }
          this.whenReady(layer._layerAdd, layer);
          return this;
        },
        // @method removeLayer(layer: Layer): this
        // Removes the given layer from the map.
        removeLayer: function(layer) {
          var id = stamp(layer);
          if (!this._layers[id]) {
            return this;
          }
          if (this._loaded) {
            layer.onRemove(this);
          }
          delete this._layers[id];
          if (this._loaded) {
            this.fire("layerremove", { layer });
            layer.fire("remove");
          }
          layer._map = layer._mapToAdd = null;
          return this;
        },
        // @method hasLayer(layer: Layer): Boolean
        // Returns `true` if the given layer is currently added to the map
        hasLayer: function(layer) {
          return stamp(layer) in this._layers;
        },
        /* @method eachLayer(fn: Function, context?: Object): this
         * Iterates over the layers of the map, optionally specifying context of the iterator function.
         * ```
         * map.eachLayer(function(layer){
         *     layer.bindPopup('Hello');
         * });
         * ```
         */
        eachLayer: function(method, context) {
          for (var i2 in this._layers) {
            method.call(context, this._layers[i2]);
          }
          return this;
        },
        _addLayers: function(layers2) {
          layers2 = layers2 ? isArray(layers2) ? layers2 : [layers2] : [];
          for (var i2 = 0, len = layers2.length; i2 < len; i2++) {
            this.addLayer(layers2[i2]);
          }
        },
        _addZoomLimit: function(layer) {
          if (!isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom)) {
            this._zoomBoundLayers[stamp(layer)] = layer;
            this._updateZoomLevels();
          }
        },
        _removeZoomLimit: function(layer) {
          var id = stamp(layer);
          if (this._zoomBoundLayers[id]) {
            delete this._zoomBoundLayers[id];
            this._updateZoomLevels();
          }
        },
        _updateZoomLevels: function() {
          var minZoom = Infinity, maxZoom = -Infinity, oldZoomSpan = this._getZoomSpan();
          for (var i2 in this._zoomBoundLayers) {
            var options = this._zoomBoundLayers[i2].options;
            minZoom = options.minZoom === void 0 ? minZoom : Math.min(minZoom, options.minZoom);
            maxZoom = options.maxZoom === void 0 ? maxZoom : Math.max(maxZoom, options.maxZoom);
          }
          this._layersMaxZoom = maxZoom === -Infinity ? void 0 : maxZoom;
          this._layersMinZoom = minZoom === Infinity ? void 0 : minZoom;
          if (oldZoomSpan !== this._getZoomSpan()) {
            this.fire("zoomlevelschange");
          }
          if (this.options.maxZoom === void 0 && this._layersMaxZoom && this.getZoom() > this._layersMaxZoom) {
            this.setZoom(this._layersMaxZoom);
          }
          if (this.options.minZoom === void 0 && this._layersMinZoom && this.getZoom() < this._layersMinZoom) {
            this.setZoom(this._layersMinZoom);
          }
        }
      });
      var LayerGroup = Layer.extend({
        initialize: function(layers2, options) {
          setOptions(this, options);
          this._layers = {};
          var i2, len;
          if (layers2) {
            for (i2 = 0, len = layers2.length; i2 < len; i2++) {
              this.addLayer(layers2[i2]);
            }
          }
        },
        // @method addLayer(layer: Layer): this
        // Adds the given layer to the group.
        addLayer: function(layer) {
          var id = this.getLayerId(layer);
          this._layers[id] = layer;
          if (this._map) {
            this._map.addLayer(layer);
          }
          return this;
        },
        // @method removeLayer(layer: Layer): this
        // Removes the given layer from the group.
        // @alternative
        // @method removeLayer(id: Number): this
        // Removes the layer with the given internal ID from the group.
        removeLayer: function(layer) {
          var id = layer in this._layers ? layer : this.getLayerId(layer);
          if (this._map && this._layers[id]) {
            this._map.removeLayer(this._layers[id]);
          }
          delete this._layers[id];
          return this;
        },
        // @method hasLayer(layer: Layer): Boolean
        // Returns `true` if the given layer is currently added to the group.
        // @alternative
        // @method hasLayer(id: Number): Boolean
        // Returns `true` if the given internal ID is currently added to the group.
        hasLayer: function(layer) {
          var layerId = typeof layer === "number" ? layer : this.getLayerId(layer);
          return layerId in this._layers;
        },
        // @method clearLayers(): this
        // Removes all the layers from the group.
        clearLayers: function() {
          return this.eachLayer(this.removeLayer, this);
        },
        // @method invoke(methodName: String, …): this
        // Calls `methodName` on every layer contained in this group, passing any
        // additional parameters. Has no effect if the layers contained do not
        // implement `methodName`.
        invoke: function(methodName) {
          var args = Array.prototype.slice.call(arguments, 1), i2, layer;
          for (i2 in this._layers) {
            layer = this._layers[i2];
            if (layer[methodName]) {
              layer[methodName].apply(layer, args);
            }
          }
          return this;
        },
        onAdd: function(map2) {
          this.eachLayer(map2.addLayer, map2);
        },
        onRemove: function(map2) {
          this.eachLayer(map2.removeLayer, map2);
        },
        // @method eachLayer(fn: Function, context?: Object): this
        // Iterates over the layers of the group, optionally specifying context of the iterator function.
        // ```js
        // group.eachLayer(function (layer) {
        // 	layer.bindPopup('Hello');
        // });
        // ```
        eachLayer: function(method, context) {
          for (var i2 in this._layers) {
            method.call(context, this._layers[i2]);
          }
          return this;
        },
        // @method getLayer(id: Number): Layer
        // Returns the layer with the given internal ID.
        getLayer: function(id) {
          return this._layers[id];
        },
        // @method getLayers(): Layer[]
        // Returns an array of all the layers added to the group.
        getLayers: function() {
          var layers2 = [];
          this.eachLayer(layers2.push, layers2);
          return layers2;
        },
        // @method setZIndex(zIndex: Number): this
        // Calls `setZIndex` on every layer contained in this group, passing the z-index.
        setZIndex: function(zIndex) {
          return this.invoke("setZIndex", zIndex);
        },
        // @method getLayerId(layer: Layer): Number
        // Returns the internal ID for a layer
        getLayerId: function(layer) {
          return stamp(layer);
        }
      });
      var layerGroup = function(layers2, options) {
        return new LayerGroup(layers2, options);
      };
      var FeatureGroup = LayerGroup.extend({
        addLayer: function(layer) {
          if (this.hasLayer(layer)) {
            return this;
          }
          layer.addEventParent(this);
          LayerGroup.prototype.addLayer.call(this, layer);
          return this.fire("layeradd", { layer });
        },
        removeLayer: function(layer) {
          if (!this.hasLayer(layer)) {
            return this;
          }
          if (layer in this._layers) {
            layer = this._layers[layer];
          }
          layer.removeEventParent(this);
          LayerGroup.prototype.removeLayer.call(this, layer);
          return this.fire("layerremove", { layer });
        },
        // @method setStyle(style: Path options): this
        // Sets the given path options to each layer of the group that has a `setStyle` method.
        setStyle: function(style2) {
          return this.invoke("setStyle", style2);
        },
        // @method bringToFront(): this
        // Brings the layer group to the top of all other layers
        bringToFront: function() {
          return this.invoke("bringToFront");
        },
        // @method bringToBack(): this
        // Brings the layer group to the back of all other layers
        bringToBack: function() {
          return this.invoke("bringToBack");
        },
        // @method getBounds(): LatLngBounds
        // Returns the LatLngBounds of the Feature Group (created from bounds and coordinates of its children).
        getBounds: function() {
          var bounds = new LatLngBounds();
          for (var id in this._layers) {
            var layer = this._layers[id];
            bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
          }
          return bounds;
        }
      });
      var featureGroup = function(layers2, options) {
        return new FeatureGroup(layers2, options);
      };
      var Icon2 = Class.extend({
        /* @section
         * @aka Icon options
         *
         * @option iconUrl: String = null
         * **(required)** The URL to the icon image (absolute or relative to your script path).
         *
         * @option iconRetinaUrl: String = null
         * The URL to a retina sized version of the icon image (absolute or relative to your
         * script path). Used for Retina screen devices.
         *
         * @option iconSize: Point = null
         * Size of the icon image in pixels.
         *
         * @option iconAnchor: Point = null
         * The coordinates of the "tip" of the icon (relative to its top left corner). The icon
         * will be aligned so that this point is at the marker's geographical location. Centered
         * by default if size is specified, also can be set in CSS with negative margins.
         *
         * @option popupAnchor: Point = [0, 0]
         * The coordinates of the point from which popups will "open", relative to the icon anchor.
         *
         * @option tooltipAnchor: Point = [0, 0]
         * The coordinates of the point from which tooltips will "open", relative to the icon anchor.
         *
         * @option shadowUrl: String = null
         * The URL to the icon shadow image. If not specified, no shadow image will be created.
         *
         * @option shadowRetinaUrl: String = null
         *
         * @option shadowSize: Point = null
         * Size of the shadow image in pixels.
         *
         * @option shadowAnchor: Point = null
         * The coordinates of the "tip" of the shadow (relative to its top left corner) (the same
         * as iconAnchor if not specified).
         *
         * @option className: String = ''
         * A custom class name to assign to both icon and shadow images. Empty by default.
         */
        options: {
          popupAnchor: [0, 0],
          tooltipAnchor: [0, 0],
          // @option crossOrigin: Boolean|String = false
          // Whether the crossOrigin attribute will be added to the tiles.
          // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
          // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
          crossOrigin: false
        },
        initialize: function(options) {
          setOptions(this, options);
        },
        // @method createIcon(oldIcon?: HTMLElement): HTMLElement
        // Called internally when the icon has to be shown, returns a `<img>` HTML element
        // styled according to the options.
        createIcon: function(oldIcon) {
          return this._createIcon("icon", oldIcon);
        },
        // @method createShadow(oldIcon?: HTMLElement): HTMLElement
        // As `createIcon`, but for the shadow beneath it.
        createShadow: function(oldIcon) {
          return this._createIcon("shadow", oldIcon);
        },
        _createIcon: function(name, oldIcon) {
          var src = this._getIconUrl(name);
          if (!src) {
            if (name === "icon") {
              throw new Error("iconUrl not set in Icon options (see the docs).");
            }
            return null;
          }
          var img = this._createImg(src, oldIcon && oldIcon.tagName === "IMG" ? oldIcon : null);
          this._setIconStyles(img, name);
          if (this.options.crossOrigin || this.options.crossOrigin === "") {
            img.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
          }
          return img;
        },
        _setIconStyles: function(img, name) {
          var options = this.options;
          var sizeOption = options[name + "Size"];
          if (typeof sizeOption === "number") {
            sizeOption = [sizeOption, sizeOption];
          }
          var size = toPoint(sizeOption), anchor = toPoint(name === "shadow" && options.shadowAnchor || options.iconAnchor || size && size.divideBy(2, true));
          img.className = "leaflet-marker-" + name + " " + (options.className || "");
          if (anchor) {
            img.style.marginLeft = -anchor.x + "px";
            img.style.marginTop = -anchor.y + "px";
          }
          if (size) {
            img.style.width = size.x + "px";
            img.style.height = size.y + "px";
          }
        },
        _createImg: function(src, el) {
          el = el || document.createElement("img");
          el.src = src;
          return el;
        },
        _getIconUrl: function(name) {
          return Browser.retina && this.options[name + "RetinaUrl"] || this.options[name + "Url"];
        }
      });
      function icon(options) {
        return new Icon2(options);
      }
      var IconDefault = Icon2.extend({
        options: {
          iconUrl: "marker-icon.png",
          iconRetinaUrl: "marker-icon-2x.png",
          shadowUrl: "marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          tooltipAnchor: [16, -28],
          shadowSize: [41, 41]
        },
        _getIconUrl: function(name) {
          if (typeof IconDefault.imagePath !== "string") {
            IconDefault.imagePath = this._detectIconPath();
          }
          return (this.options.imagePath || IconDefault.imagePath) + Icon2.prototype._getIconUrl.call(this, name);
        },
        _stripUrl: function(path) {
          var strip = function(str, re2, idx) {
            var match = re2.exec(str);
            return match && match[idx];
          };
          path = strip(path, /^url\((['"])?(.+)\1\)$/, 2);
          return path && strip(path, /^(.*)marker-icon\.png$/, 1);
        },
        _detectIconPath: function() {
          var el = create$1("div", "leaflet-default-icon-path", document.body);
          var path = getStyle(el, "background-image") || getStyle(el, "backgroundImage");
          document.body.removeChild(el);
          path = this._stripUrl(path);
          if (path) {
            return path;
          }
          var link = document.querySelector('link[href$="leaflet.css"]');
          if (!link) {
            return "";
          }
          return link.href.substring(0, link.href.length - "leaflet.css".length - 1);
        }
      });
      var MarkerDrag = Handler.extend({
        initialize: function(marker3) {
          this._marker = marker3;
        },
        addHooks: function() {
          var icon2 = this._marker._icon;
          if (!this._draggable) {
            this._draggable = new Draggable(icon2, icon2, true);
          }
          this._draggable.on({
            dragstart: this._onDragStart,
            predrag: this._onPreDrag,
            drag: this._onDrag,
            dragend: this._onDragEnd
          }, this).enable();
          addClass(icon2, "leaflet-marker-draggable");
        },
        removeHooks: function() {
          this._draggable.off({
            dragstart: this._onDragStart,
            predrag: this._onPreDrag,
            drag: this._onDrag,
            dragend: this._onDragEnd
          }, this).disable();
          if (this._marker._icon) {
            removeClass(this._marker._icon, "leaflet-marker-draggable");
          }
        },
        moved: function() {
          return this._draggable && this._draggable._moved;
        },
        _adjustPan: function(e2) {
          var marker3 = this._marker, map2 = marker3._map, speed = this._marker.options.autoPanSpeed, padding = this._marker.options.autoPanPadding, iconPos = getPosition(marker3._icon), bounds = map2.getPixelBounds(), origin = map2.getPixelOrigin();
          var panBounds = toBounds(
            bounds.min._subtract(origin).add(padding),
            bounds.max._subtract(origin).subtract(padding)
          );
          if (!panBounds.contains(iconPos)) {
            var movement = toPoint(
              (Math.max(panBounds.max.x, iconPos.x) - panBounds.max.x) / (bounds.max.x - panBounds.max.x) - (Math.min(panBounds.min.x, iconPos.x) - panBounds.min.x) / (bounds.min.x - panBounds.min.x),
              (Math.max(panBounds.max.y, iconPos.y) - panBounds.max.y) / (bounds.max.y - panBounds.max.y) - (Math.min(panBounds.min.y, iconPos.y) - panBounds.min.y) / (bounds.min.y - panBounds.min.y)
            ).multiplyBy(speed);
            map2.panBy(movement, { animate: false });
            this._draggable._newPos._add(movement);
            this._draggable._startPos._add(movement);
            setPosition(marker3._icon, this._draggable._newPos);
            this._onDrag(e2);
            this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e2));
          }
        },
        _onDragStart: function() {
          this._oldLatLng = this._marker.getLatLng();
          this._marker.closePopup && this._marker.closePopup();
          this._marker.fire("movestart").fire("dragstart");
        },
        _onPreDrag: function(e2) {
          if (this._marker.options.autoPan) {
            cancelAnimFrame(this._panRequest);
            this._panRequest = requestAnimFrame(this._adjustPan.bind(this, e2));
          }
        },
        _onDrag: function(e2) {
          var marker3 = this._marker, shadow = marker3._shadow, iconPos = getPosition(marker3._icon), latlng = marker3._map.layerPointToLatLng(iconPos);
          if (shadow) {
            setPosition(shadow, iconPos);
          }
          marker3._latlng = latlng;
          e2.latlng = latlng;
          e2.oldLatLng = this._oldLatLng;
          marker3.fire("move", e2).fire("drag", e2);
        },
        _onDragEnd: function(e2) {
          cancelAnimFrame(this._panRequest);
          delete this._oldLatLng;
          this._marker.fire("moveend").fire("dragend", e2);
        }
      });
      var Marker = Layer.extend({
        // @section
        // @aka Marker options
        options: {
          // @option icon: Icon = *
          // Icon instance to use for rendering the marker.
          // See [Icon documentation](#L.Icon) for details on how to customize the marker icon.
          // If not specified, a common instance of `L.Icon.Default` is used.
          icon: new IconDefault(),
          // Option inherited from "Interactive layer" abstract class
          interactive: true,
          // @option keyboard: Boolean = true
          // Whether the marker can be tabbed to with a keyboard and clicked by pressing enter.
          keyboard: true,
          // @option title: String = ''
          // Text for the browser tooltip that appear on marker hover (no tooltip by default).
          // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
          title: "",
          // @option alt: String = 'Marker'
          // Text for the `alt` attribute of the icon image.
          // [Useful for accessibility](https://leafletjs.com/examples/accessibility/#markers-must-be-labelled).
          alt: "Marker",
          // @option zIndexOffset: Number = 0
          // By default, marker images zIndex is set automatically based on its latitude. Use this option if you want to put the marker on top of all others (or below), specifying a high value like `1000` (or high negative value, respectively).
          zIndexOffset: 0,
          // @option opacity: Number = 1.0
          // The opacity of the marker.
          opacity: 1,
          // @option riseOnHover: Boolean = false
          // If `true`, the marker will get on top of others when you hover the mouse over it.
          riseOnHover: false,
          // @option riseOffset: Number = 250
          // The z-index offset used for the `riseOnHover` feature.
          riseOffset: 250,
          // @option pane: String = 'markerPane'
          // `Map pane` where the markers icon will be added.
          pane: "markerPane",
          // @option shadowPane: String = 'shadowPane'
          // `Map pane` where the markers shadow will be added.
          shadowPane: "shadowPane",
          // @option bubblingMouseEvents: Boolean = false
          // When `true`, a mouse event on this marker will trigger the same event on the map
          // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
          bubblingMouseEvents: false,
          // @option autoPanOnFocus: Boolean = true
          // When `true`, the map will pan whenever the marker is focused (via
          // e.g. pressing `tab` on the keyboard) to ensure the marker is
          // visible within the map's bounds
          autoPanOnFocus: true,
          // @section Draggable marker options
          // @option draggable: Boolean = false
          // Whether the marker is draggable with mouse/touch or not.
          draggable: false,
          // @option autoPan: Boolean = false
          // Whether to pan the map when dragging this marker near its edge or not.
          autoPan: false,
          // @option autoPanPadding: Point = Point(50, 50)
          // Distance (in pixels to the left/right and to the top/bottom) of the
          // map edge to start panning the map.
          autoPanPadding: [50, 50],
          // @option autoPanSpeed: Number = 10
          // Number of pixels the map should pan by.
          autoPanSpeed: 10
        },
        /* @section
         *
         * In addition to [shared layer methods](#Layer) like `addTo()` and `remove()` and [popup methods](#Popup) like bindPopup() you can also use the following methods:
         */
        initialize: function(latlng, options) {
          setOptions(this, options);
          this._latlng = toLatLng(latlng);
        },
        onAdd: function(map2) {
          this._zoomAnimated = this._zoomAnimated && map2.options.markerZoomAnimation;
          if (this._zoomAnimated) {
            map2.on("zoomanim", this._animateZoom, this);
          }
          this._initIcon();
          this.update();
        },
        onRemove: function(map2) {
          if (this.dragging && this.dragging.enabled()) {
            this.options.draggable = true;
            this.dragging.removeHooks();
          }
          delete this.dragging;
          if (this._zoomAnimated) {
            map2.off("zoomanim", this._animateZoom, this);
          }
          this._removeIcon();
          this._removeShadow();
        },
        getEvents: function() {
          return {
            zoom: this.update,
            viewreset: this.update
          };
        },
        // @method getLatLng: LatLng
        // Returns the current geographical position of the marker.
        getLatLng: function() {
          return this._latlng;
        },
        // @method setLatLng(latlng: LatLng): this
        // Changes the marker position to the given point.
        setLatLng: function(latlng) {
          var oldLatLng = this._latlng;
          this._latlng = toLatLng(latlng);
          this.update();
          return this.fire("move", { oldLatLng, latlng: this._latlng });
        },
        // @method setZIndexOffset(offset: Number): this
        // Changes the [zIndex offset](#marker-zindexoffset) of the marker.
        setZIndexOffset: function(offset) {
          this.options.zIndexOffset = offset;
          return this.update();
        },
        // @method getIcon: Icon
        // Returns the current icon used by the marker
        getIcon: function() {
          return this.options.icon;
        },
        // @method setIcon(icon: Icon): this
        // Changes the marker icon.
        setIcon: function(icon2) {
          this.options.icon = icon2;
          if (this._map) {
            this._initIcon();
            this.update();
          }
          if (this._popup) {
            this.bindPopup(this._popup, this._popup.options);
          }
          return this;
        },
        getElement: function() {
          return this._icon;
        },
        update: function() {
          if (this._icon && this._map) {
            var pos = this._map.latLngToLayerPoint(this._latlng).round();
            this._setPos(pos);
          }
          return this;
        },
        _initIcon: function() {
          var options = this.options, classToAdd = "leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide");
          var icon2 = options.icon.createIcon(this._icon), addIcon = false;
          if (icon2 !== this._icon) {
            if (this._icon) {
              this._removeIcon();
            }
            addIcon = true;
            if (options.title) {
              icon2.title = options.title;
            }
            if (icon2.tagName === "IMG") {
              icon2.alt = options.alt || "";
            }
          }
          addClass(icon2, classToAdd);
          if (options.keyboard) {
            icon2.tabIndex = "0";
            icon2.setAttribute("role", "button");
          }
          this._icon = icon2;
          if (options.riseOnHover) {
            this.on({
              mouseover: this._bringToFront,
              mouseout: this._resetZIndex
            });
          }
          if (this.options.autoPanOnFocus) {
            on(icon2, "focus", this._panOnFocus, this);
          }
          var newShadow = options.icon.createShadow(this._shadow), addShadow = false;
          if (newShadow !== this._shadow) {
            this._removeShadow();
            addShadow = true;
          }
          if (newShadow) {
            addClass(newShadow, classToAdd);
            newShadow.alt = "";
          }
          this._shadow = newShadow;
          if (options.opacity < 1) {
            this._updateOpacity();
          }
          if (addIcon) {
            this.getPane().appendChild(this._icon);
          }
          this._initInteraction();
          if (newShadow && addShadow) {
            this.getPane(options.shadowPane).appendChild(this._shadow);
          }
        },
        _removeIcon: function() {
          if (this.options.riseOnHover) {
            this.off({
              mouseover: this._bringToFront,
              mouseout: this._resetZIndex
            });
          }
          if (this.options.autoPanOnFocus) {
            off(this._icon, "focus", this._panOnFocus, this);
          }
          remove(this._icon);
          this.removeInteractiveTarget(this._icon);
          this._icon = null;
        },
        _removeShadow: function() {
          if (this._shadow) {
            remove(this._shadow);
          }
          this._shadow = null;
        },
        _setPos: function(pos) {
          if (this._icon) {
            setPosition(this._icon, pos);
          }
          if (this._shadow) {
            setPosition(this._shadow, pos);
          }
          this._zIndex = pos.y + this.options.zIndexOffset;
          this._resetZIndex();
        },
        _updateZIndex: function(offset) {
          if (this._icon) {
            this._icon.style.zIndex = this._zIndex + offset;
          }
        },
        _animateZoom: function(opt) {
          var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();
          this._setPos(pos);
        },
        _initInteraction: function() {
          if (!this.options.interactive) {
            return;
          }
          addClass(this._icon, "leaflet-interactive");
          this.addInteractiveTarget(this._icon);
          if (MarkerDrag) {
            var draggable = this.options.draggable;
            if (this.dragging) {
              draggable = this.dragging.enabled();
              this.dragging.disable();
            }
            this.dragging = new MarkerDrag(this);
            if (draggable) {
              this.dragging.enable();
            }
          }
        },
        // @method setOpacity(opacity: Number): this
        // Changes the opacity of the marker.
        setOpacity: function(opacity) {
          this.options.opacity = opacity;
          if (this._map) {
            this._updateOpacity();
          }
          return this;
        },
        _updateOpacity: function() {
          var opacity = this.options.opacity;
          if (this._icon) {
            setOpacity(this._icon, opacity);
          }
          if (this._shadow) {
            setOpacity(this._shadow, opacity);
          }
        },
        _bringToFront: function() {
          this._updateZIndex(this.options.riseOffset);
        },
        _resetZIndex: function() {
          this._updateZIndex(0);
        },
        _panOnFocus: function() {
          var map2 = this._map;
          if (!map2) {
            return;
          }
          var iconOpts = this.options.icon.options;
          var size = iconOpts.iconSize ? toPoint(iconOpts.iconSize) : toPoint(0, 0);
          var anchor = iconOpts.iconAnchor ? toPoint(iconOpts.iconAnchor) : toPoint(0, 0);
          map2.panInside(this._latlng, {
            paddingTopLeft: anchor,
            paddingBottomRight: size.subtract(anchor)
          });
        },
        _getPopupAnchor: function() {
          return this.options.icon.options.popupAnchor;
        },
        _getTooltipAnchor: function() {
          return this.options.icon.options.tooltipAnchor;
        }
      });
      function marker2(latlng, options) {
        return new Marker(latlng, options);
      }
      var Path = Layer.extend({
        // @section
        // @aka Path options
        options: {
          // @option stroke: Boolean = true
          // Whether to draw stroke along the path. Set it to `false` to disable borders on polygons or circles.
          stroke: true,
          // @option color: String = '#3388ff'
          // Stroke color
          color: "#3388ff",
          // @option weight: Number = 3
          // Stroke width in pixels
          weight: 3,
          // @option opacity: Number = 1.0
          // Stroke opacity
          opacity: 1,
          // @option lineCap: String= 'round'
          // A string that defines [shape to be used at the end](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linecap) of the stroke.
          lineCap: "round",
          // @option lineJoin: String = 'round'
          // A string that defines [shape to be used at the corners](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-linejoin) of the stroke.
          lineJoin: "round",
          // @option dashArray: String = null
          // A string that defines the stroke [dash pattern](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dasharray). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
          dashArray: null,
          // @option dashOffset: String = null
          // A string that defines the [distance into the dash pattern to start the dash](https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset). Doesn't work on `Canvas`-powered layers in [some old browsers](https://developer.mozilla.org/docs/Web/API/CanvasRenderingContext2D/setLineDash#Browser_compatibility).
          dashOffset: null,
          // @option fill: Boolean = depends
          // Whether to fill the path with color. Set it to `false` to disable filling on polygons or circles.
          fill: false,
          // @option fillColor: String = *
          // Fill color. Defaults to the value of the [`color`](#path-color) option
          fillColor: null,
          // @option fillOpacity: Number = 0.2
          // Fill opacity.
          fillOpacity: 0.2,
          // @option fillRule: String = 'evenodd'
          // A string that defines [how the inside of a shape](https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule) is determined.
          fillRule: "evenodd",
          // className: '',
          // Option inherited from "Interactive layer" abstract class
          interactive: true,
          // @option bubblingMouseEvents: Boolean = true
          // When `true`, a mouse event on this path will trigger the same event on the map
          // (unless [`L.DomEvent.stopPropagation`](#domevent-stoppropagation) is used).
          bubblingMouseEvents: true
        },
        beforeAdd: function(map2) {
          this._renderer = map2.getRenderer(this);
        },
        onAdd: function() {
          this._renderer._initPath(this);
          this._reset();
          this._renderer._addPath(this);
        },
        onRemove: function() {
          this._renderer._removePath(this);
        },
        // @method redraw(): this
        // Redraws the layer. Sometimes useful after you changed the coordinates that the path uses.
        redraw: function() {
          if (this._map) {
            this._renderer._updatePath(this);
          }
          return this;
        },
        // @method setStyle(style: Path options): this
        // Changes the appearance of a Path based on the options in the `Path options` object.
        setStyle: function(style2) {
          setOptions(this, style2);
          if (this._renderer) {
            this._renderer._updateStyle(this);
            if (this.options.stroke && style2 && Object.prototype.hasOwnProperty.call(style2, "weight")) {
              this._updateBounds();
            }
          }
          return this;
        },
        // @method bringToFront(): this
        // Brings the layer to the top of all path layers.
        bringToFront: function() {
          if (this._renderer) {
            this._renderer._bringToFront(this);
          }
          return this;
        },
        // @method bringToBack(): this
        // Brings the layer to the bottom of all path layers.
        bringToBack: function() {
          if (this._renderer) {
            this._renderer._bringToBack(this);
          }
          return this;
        },
        getElement: function() {
          return this._path;
        },
        _reset: function() {
          this._project();
          this._update();
        },
        _clickTolerance: function() {
          return (this.options.stroke ? this.options.weight / 2 : 0) + (this._renderer.options.tolerance || 0);
        }
      });
      var CircleMarker = Path.extend({
        // @section
        // @aka CircleMarker options
        options: {
          fill: true,
          // @option radius: Number = 10
          // Radius of the circle marker, in pixels
          radius: 10
        },
        initialize: function(latlng, options) {
          setOptions(this, options);
          this._latlng = toLatLng(latlng);
          this._radius = this.options.radius;
        },
        // @method setLatLng(latLng: LatLng): this
        // Sets the position of a circle marker to a new location.
        setLatLng: function(latlng) {
          var oldLatLng = this._latlng;
          this._latlng = toLatLng(latlng);
          this.redraw();
          return this.fire("move", { oldLatLng, latlng: this._latlng });
        },
        // @method getLatLng(): LatLng
        // Returns the current geographical position of the circle marker
        getLatLng: function() {
          return this._latlng;
        },
        // @method setRadius(radius: Number): this
        // Sets the radius of a circle marker. Units are in pixels.
        setRadius: function(radius) {
          this.options.radius = this._radius = radius;
          return this.redraw();
        },
        // @method getRadius(): Number
        // Returns the current radius of the circle
        getRadius: function() {
          return this._radius;
        },
        setStyle: function(options) {
          var radius = options && options.radius || this._radius;
          Path.prototype.setStyle.call(this, options);
          this.setRadius(radius);
          return this;
        },
        _project: function() {
          this._point = this._map.latLngToLayerPoint(this._latlng);
          this._updateBounds();
        },
        _updateBounds: function() {
          var r2 = this._radius, r22 = this._radiusY || r2, w2 = this._clickTolerance(), p2 = [r2 + w2, r22 + w2];
          this._pxBounds = new Bounds(this._point.subtract(p2), this._point.add(p2));
        },
        _update: function() {
          if (this._map) {
            this._updatePath();
          }
        },
        _updatePath: function() {
          this._renderer._updateCircle(this);
        },
        _empty: function() {
          return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
        },
        // Needed by the `Canvas` renderer for interactivity
        _containsPoint: function(p2) {
          return p2.distanceTo(this._point) <= this._radius + this._clickTolerance();
        }
      });
      function circleMarker(latlng, options) {
        return new CircleMarker(latlng, options);
      }
      var Circle = CircleMarker.extend({
        initialize: function(latlng, options, legacyOptions) {
          if (typeof options === "number") {
            options = extend({}, legacyOptions, { radius: options });
          }
          setOptions(this, options);
          this._latlng = toLatLng(latlng);
          if (isNaN(this.options.radius)) {
            throw new Error("Circle radius cannot be NaN");
          }
          this._mRadius = this.options.radius;
        },
        // @method setRadius(radius: Number): this
        // Sets the radius of a circle. Units are in meters.
        setRadius: function(radius) {
          this._mRadius = radius;
          return this.redraw();
        },
        // @method getRadius(): Number
        // Returns the current radius of a circle. Units are in meters.
        getRadius: function() {
          return this._mRadius;
        },
        // @method getBounds(): LatLngBounds
        // Returns the `LatLngBounds` of the path.
        getBounds: function() {
          var half = [this._radius, this._radiusY || this._radius];
          return new LatLngBounds(
            this._map.layerPointToLatLng(this._point.subtract(half)),
            this._map.layerPointToLatLng(this._point.add(half))
          );
        },
        setStyle: Path.prototype.setStyle,
        _project: function() {
          var lng = this._latlng.lng, lat = this._latlng.lat, map2 = this._map, crs = map2.options.crs;
          if (crs.distance === Earth.distance) {
            var d2 = Math.PI / 180, latR = this._mRadius / Earth.R / d2, top = map2.project([lat + latR, lng]), bottom = map2.project([lat - latR, lng]), p2 = top.add(bottom).divideBy(2), lat2 = map2.unproject(p2).lat, lngR = Math.acos((Math.cos(latR * d2) - Math.sin(lat * d2) * Math.sin(lat2 * d2)) / (Math.cos(lat * d2) * Math.cos(lat2 * d2))) / d2;
            if (isNaN(lngR) || lngR === 0) {
              lngR = latR / Math.cos(Math.PI / 180 * lat);
            }
            this._point = p2.subtract(map2.getPixelOrigin());
            this._radius = isNaN(lngR) ? 0 : p2.x - map2.project([lat2, lng - lngR]).x;
            this._radiusY = p2.y - top.y;
          } else {
            var latlng2 = crs.unproject(crs.project(this._latlng).subtract([this._mRadius, 0]));
            this._point = map2.latLngToLayerPoint(this._latlng);
            this._radius = this._point.x - map2.latLngToLayerPoint(latlng2).x;
          }
          this._updateBounds();
        }
      });
      function circle(latlng, options, legacyOptions) {
        return new Circle(latlng, options, legacyOptions);
      }
      var Polyline = Path.extend({
        // @section
        // @aka Polyline options
        options: {
          // @option smoothFactor: Number = 1.0
          // How much to simplify the polyline on each zoom level. More means
          // better performance and smoother look, and less means more accurate representation.
          smoothFactor: 1,
          // @option noClip: Boolean = false
          // Disable polyline clipping.
          noClip: false
        },
        initialize: function(latlngs, options) {
          setOptions(this, options);
          this._setLatLngs(latlngs);
        },
        // @method getLatLngs(): LatLng[]
        // Returns an array of the points in the path, or nested arrays of points in case of multi-polyline.
        getLatLngs: function() {
          return this._latlngs;
        },
        // @method setLatLngs(latlngs: LatLng[]): this
        // Replaces all the points in the polyline with the given array of geographical points.
        setLatLngs: function(latlngs) {
          this._setLatLngs(latlngs);
          return this.redraw();
        },
        // @method isEmpty(): Boolean
        // Returns `true` if the Polyline has no LatLngs.
        isEmpty: function() {
          return !this._latlngs.length;
        },
        // @method closestLayerPoint(p: Point): Point
        // Returns the point closest to `p` on the Polyline.
        closestLayerPoint: function(p2) {
          var minDistance = Infinity, minPoint = null, closest = _sqClosestPointOnSegment, p1, p22;
          for (var j2 = 0, jLen = this._parts.length; j2 < jLen; j2++) {
            var points = this._parts[j2];
            for (var i2 = 1, len = points.length; i2 < len; i2++) {
              p1 = points[i2 - 1];
              p22 = points[i2];
              var sqDist = closest(p2, p1, p22, true);
              if (sqDist < minDistance) {
                minDistance = sqDist;
                minPoint = closest(p2, p1, p22);
              }
            }
          }
          if (minPoint) {
            minPoint.distance = Math.sqrt(minDistance);
          }
          return minPoint;
        },
        // @method getCenter(): LatLng
        // Returns the center ([centroid](https://en.wikipedia.org/wiki/Centroid)) of the polyline.
        getCenter: function() {
          if (!this._map) {
            throw new Error("Must add layer to map before using getCenter()");
          }
          return polylineCenter(this._defaultShape(), this._map.options.crs);
        },
        // @method getBounds(): LatLngBounds
        // Returns the `LatLngBounds` of the path.
        getBounds: function() {
          return this._bounds;
        },
        // @method addLatLng(latlng: LatLng, latlngs?: LatLng[]): this
        // Adds a given point to the polyline. By default, adds to the first ring of
        // the polyline in case of a multi-polyline, but can be overridden by passing
        // a specific ring as a LatLng array (that you can earlier access with [`getLatLngs`](#polyline-getlatlngs)).
        addLatLng: function(latlng, latlngs) {
          latlngs = latlngs || this._defaultShape();
          latlng = toLatLng(latlng);
          latlngs.push(latlng);
          this._bounds.extend(latlng);
          return this.redraw();
        },
        _setLatLngs: function(latlngs) {
          this._bounds = new LatLngBounds();
          this._latlngs = this._convertLatLngs(latlngs);
        },
        _defaultShape: function() {
          return isFlat(this._latlngs) ? this._latlngs : this._latlngs[0];
        },
        // recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
        _convertLatLngs: function(latlngs) {
          var result = [], flat = isFlat(latlngs);
          for (var i2 = 0, len = latlngs.length; i2 < len; i2++) {
            if (flat) {
              result[i2] = toLatLng(latlngs[i2]);
              this._bounds.extend(result[i2]);
            } else {
              result[i2] = this._convertLatLngs(latlngs[i2]);
            }
          }
          return result;
        },
        _project: function() {
          var pxBounds = new Bounds();
          this._rings = [];
          this._projectLatlngs(this._latlngs, this._rings, pxBounds);
          if (this._bounds.isValid() && pxBounds.isValid()) {
            this._rawPxBounds = pxBounds;
            this._updateBounds();
          }
        },
        _updateBounds: function() {
          var w2 = this._clickTolerance(), p2 = new Point(w2, w2);
          if (!this._rawPxBounds) {
            return;
          }
          this._pxBounds = new Bounds([
            this._rawPxBounds.min.subtract(p2),
            this._rawPxBounds.max.add(p2)
          ]);
        },
        // recursively turns latlngs into a set of rings with projected coordinates
        _projectLatlngs: function(latlngs, result, projectedBounds) {
          var flat = latlngs[0] instanceof LatLng, len = latlngs.length, i2, ring;
          if (flat) {
            ring = [];
            for (i2 = 0; i2 < len; i2++) {
              ring[i2] = this._map.latLngToLayerPoint(latlngs[i2]);
              projectedBounds.extend(ring[i2]);
            }
            result.push(ring);
          } else {
            for (i2 = 0; i2 < len; i2++) {
              this._projectLatlngs(latlngs[i2], result, projectedBounds);
            }
          }
        },
        // clip polyline by renderer bounds so that we have less to render for performance
        _clipPoints: function() {
          var bounds = this._renderer._bounds;
          this._parts = [];
          if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
            return;
          }
          if (this.options.noClip) {
            this._parts = this._rings;
            return;
          }
          var parts = this._parts, i2, j2, k2, len, len2, segment, points;
          for (i2 = 0, k2 = 0, len = this._rings.length; i2 < len; i2++) {
            points = this._rings[i2];
            for (j2 = 0, len2 = points.length; j2 < len2 - 1; j2++) {
              segment = clipSegment(points[j2], points[j2 + 1], bounds, j2, true);
              if (!segment) {
                continue;
              }
              parts[k2] = parts[k2] || [];
              parts[k2].push(segment[0]);
              if (segment[1] !== points[j2 + 1] || j2 === len2 - 2) {
                parts[k2].push(segment[1]);
                k2++;
              }
            }
          }
        },
        // simplify each clipped part of the polyline for performance
        _simplifyPoints: function() {
          var parts = this._parts, tolerance = this.options.smoothFactor;
          for (var i2 = 0, len = parts.length; i2 < len; i2++) {
            parts[i2] = simplify(parts[i2], tolerance);
          }
        },
        _update: function() {
          if (!this._map) {
            return;
          }
          this._clipPoints();
          this._simplifyPoints();
          this._updatePath();
        },
        _updatePath: function() {
          this._renderer._updatePoly(this);
        },
        // Needed by the `Canvas` renderer for interactivity
        _containsPoint: function(p2, closed) {
          var i2, j2, k2, len, len2, part, w2 = this._clickTolerance();
          if (!this._pxBounds || !this._pxBounds.contains(p2)) {
            return false;
          }
          for (i2 = 0, len = this._parts.length; i2 < len; i2++) {
            part = this._parts[i2];
            for (j2 = 0, len2 = part.length, k2 = len2 - 1; j2 < len2; k2 = j2++) {
              if (!closed && j2 === 0) {
                continue;
              }
              if (pointToSegmentDistance(p2, part[k2], part[j2]) <= w2) {
                return true;
              }
            }
          }
          return false;
        }
      });
      function polyline2(latlngs, options) {
        return new Polyline(latlngs, options);
      }
      Polyline._flat = _flat;
      var Polygon = Polyline.extend({
        options: {
          fill: true
        },
        isEmpty: function() {
          return !this._latlngs.length || !this._latlngs[0].length;
        },
        // @method getCenter(): LatLng
        // Returns the center ([centroid](http://en.wikipedia.org/wiki/Centroid)) of the Polygon.
        getCenter: function() {
          if (!this._map) {
            throw new Error("Must add layer to map before using getCenter()");
          }
          return polygonCenter(this._defaultShape(), this._map.options.crs);
        },
        _convertLatLngs: function(latlngs) {
          var result = Polyline.prototype._convertLatLngs.call(this, latlngs), len = result.length;
          if (len >= 2 && result[0] instanceof LatLng && result[0].equals(result[len - 1])) {
            result.pop();
          }
          return result;
        },
        _setLatLngs: function(latlngs) {
          Polyline.prototype._setLatLngs.call(this, latlngs);
          if (isFlat(this._latlngs)) {
            this._latlngs = [this._latlngs];
          }
        },
        _defaultShape: function() {
          return isFlat(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
        },
        _clipPoints: function() {
          var bounds = this._renderer._bounds, w2 = this.options.weight, p2 = new Point(w2, w2);
          bounds = new Bounds(bounds.min.subtract(p2), bounds.max.add(p2));
          this._parts = [];
          if (!this._pxBounds || !this._pxBounds.intersects(bounds)) {
            return;
          }
          if (this.options.noClip) {
            this._parts = this._rings;
            return;
          }
          for (var i2 = 0, len = this._rings.length, clipped; i2 < len; i2++) {
            clipped = clipPolygon(this._rings[i2], bounds, true);
            if (clipped.length) {
              this._parts.push(clipped);
            }
          }
        },
        _updatePath: function() {
          this._renderer._updatePoly(this, true);
        },
        // Needed by the `Canvas` renderer for interactivity
        _containsPoint: function(p2) {
          var inside = false, part, p1, p22, i2, j2, k2, len, len2;
          if (!this._pxBounds || !this._pxBounds.contains(p2)) {
            return false;
          }
          for (i2 = 0, len = this._parts.length; i2 < len; i2++) {
            part = this._parts[i2];
            for (j2 = 0, len2 = part.length, k2 = len2 - 1; j2 < len2; k2 = j2++) {
              p1 = part[j2];
              p22 = part[k2];
              if (p1.y > p2.y !== p22.y > p2.y && p2.x < (p22.x - p1.x) * (p2.y - p1.y) / (p22.y - p1.y) + p1.x) {
                inside = !inside;
              }
            }
          }
          return inside || Polyline.prototype._containsPoint.call(this, p2, true);
        }
      });
      function polygon(latlngs, options) {
        return new Polygon(latlngs, options);
      }
      var GeoJSON = FeatureGroup.extend({
        /* @section
         * @aka GeoJSON options
         *
         * @option pointToLayer: Function = *
         * A `Function` defining how GeoJSON points spawn Leaflet layers. It is internally
         * called when data is added, passing the GeoJSON point feature and its `LatLng`.
         * The default is to spawn a default `Marker`:
         * ```js
         * function(geoJsonPoint, latlng) {
         * 	return L.marker(latlng);
         * }
         * ```
         *
         * @option style: Function = *
         * A `Function` defining the `Path options` for styling GeoJSON lines and polygons,
         * called internally when data is added.
         * The default value is to not override any defaults:
         * ```js
         * function (geoJsonFeature) {
         * 	return {}
         * }
         * ```
         *
         * @option onEachFeature: Function = *
         * A `Function` that will be called once for each created `Feature`, after it has
         * been created and styled. Useful for attaching events and popups to features.
         * The default is to do nothing with the newly created layers:
         * ```js
         * function (feature, layer) {}
         * ```
         *
         * @option filter: Function = *
         * A `Function` that will be used to decide whether to include a feature or not.
         * The default is to include all features:
         * ```js
         * function (geoJsonFeature) {
         * 	return true;
         * }
         * ```
         * Note: dynamically changing the `filter` option will have effect only on newly
         * added data. It will _not_ re-evaluate already included features.
         *
         * @option coordsToLatLng: Function = *
         * A `Function` that will be used for converting GeoJSON coordinates to `LatLng`s.
         * The default is the `coordsToLatLng` static method.
         *
         * @option markersInheritOptions: Boolean = false
         * Whether default Markers for "Point" type Features inherit from group options.
         */
        initialize: function(geojson, options) {
          setOptions(this, options);
          this._layers = {};
          if (geojson) {
            this.addData(geojson);
          }
        },
        // @method addData( <GeoJSON> data ): this
        // Adds a GeoJSON object to the layer.
        addData: function(geojson) {
          var features = isArray(geojson) ? geojson : geojson.features, i2, len, feature;
          if (features) {
            for (i2 = 0, len = features.length; i2 < len; i2++) {
              feature = features[i2];
              if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
                this.addData(feature);
              }
            }
            return this;
          }
          var options = this.options;
          if (options.filter && !options.filter(geojson)) {
            return this;
          }
          var layer = geometryToLayer(geojson, options);
          if (!layer) {
            return this;
          }
          layer.feature = asFeature(geojson);
          layer.defaultOptions = layer.options;
          this.resetStyle(layer);
          if (options.onEachFeature) {
            options.onEachFeature(geojson, layer);
          }
          return this.addLayer(layer);
        },
        // @method resetStyle( <Path> layer? ): this
        // Resets the given vector layer's style to the original GeoJSON style, useful for resetting style after hover events.
        // If `layer` is omitted, the style of all features in the current layer is reset.
        resetStyle: function(layer) {
          if (layer === void 0) {
            return this.eachLayer(this.resetStyle, this);
          }
          layer.options = extend({}, layer.defaultOptions);
          this._setLayerStyle(layer, this.options.style);
          return this;
        },
        // @method setStyle( <Function> style ): this
        // Changes styles of GeoJSON vector layers with the given style function.
        setStyle: function(style2) {
          return this.eachLayer(function(layer) {
            this._setLayerStyle(layer, style2);
          }, this);
        },
        _setLayerStyle: function(layer, style2) {
          if (layer.setStyle) {
            if (typeof style2 === "function") {
              style2 = style2(layer.feature);
            }
            layer.setStyle(style2);
          }
        }
      });
      function geometryToLayer(geojson, options) {
        var geometry = geojson.type === "Feature" ? geojson.geometry : geojson, coords = geometry ? geometry.coordinates : null, layers2 = [], pointToLayer = options && options.pointToLayer, _coordsToLatLng = options && options.coordsToLatLng || coordsToLatLng, latlng, latlngs, i2, len;
        if (!coords && !geometry) {
          return null;
        }
        switch (geometry.type) {
          case "Point":
            latlng = _coordsToLatLng(coords);
            return _pointToLayer(pointToLayer, geojson, latlng, options);
          case "MultiPoint":
            for (i2 = 0, len = coords.length; i2 < len; i2++) {
              latlng = _coordsToLatLng(coords[i2]);
              layers2.push(_pointToLayer(pointToLayer, geojson, latlng, options));
            }
            return new FeatureGroup(layers2);
          case "LineString":
          case "MultiLineString":
            latlngs = coordsToLatLngs(coords, geometry.type === "LineString" ? 0 : 1, _coordsToLatLng);
            return new Polyline(latlngs, options);
          case "Polygon":
          case "MultiPolygon":
            latlngs = coordsToLatLngs(coords, geometry.type === "Polygon" ? 1 : 2, _coordsToLatLng);
            return new Polygon(latlngs, options);
          case "GeometryCollection":
            for (i2 = 0, len = geometry.geometries.length; i2 < len; i2++) {
              var geoLayer = geometryToLayer({
                geometry: geometry.geometries[i2],
                type: "Feature",
                properties: geojson.properties
              }, options);
              if (geoLayer) {
                layers2.push(geoLayer);
              }
            }
            return new FeatureGroup(layers2);
          case "FeatureCollection":
            for (i2 = 0, len = geometry.features.length; i2 < len; i2++) {
              var featureLayer = geometryToLayer(geometry.features[i2], options);
              if (featureLayer) {
                layers2.push(featureLayer);
              }
            }
            return new FeatureGroup(layers2);
          default:
            throw new Error("Invalid GeoJSON object.");
        }
      }
      function _pointToLayer(pointToLayerFn, geojson, latlng, options) {
        return pointToLayerFn ? pointToLayerFn(geojson, latlng) : new Marker(latlng, options && options.markersInheritOptions && options);
      }
      function coordsToLatLng(coords) {
        return new LatLng(coords[1], coords[0], coords[2]);
      }
      function coordsToLatLngs(coords, levelsDeep, _coordsToLatLng) {
        var latlngs = [];
        for (var i2 = 0, len = coords.length, latlng; i2 < len; i2++) {
          latlng = levelsDeep ? coordsToLatLngs(coords[i2], levelsDeep - 1, _coordsToLatLng) : (_coordsToLatLng || coordsToLatLng)(coords[i2]);
          latlngs.push(latlng);
        }
        return latlngs;
      }
      function latLngToCoords(latlng, precision) {
        latlng = toLatLng(latlng);
        return latlng.alt !== void 0 ? [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision), formatNum(latlng.alt, precision)] : [formatNum(latlng.lng, precision), formatNum(latlng.lat, precision)];
      }
      function latLngsToCoords(latlngs, levelsDeep, closed, precision) {
        var coords = [];
        for (var i2 = 0, len = latlngs.length; i2 < len; i2++) {
          coords.push(levelsDeep ? latLngsToCoords(latlngs[i2], isFlat(latlngs[i2]) ? 0 : levelsDeep - 1, closed, precision) : latLngToCoords(latlngs[i2], precision));
        }
        if (!levelsDeep && closed && coords.length > 0) {
          coords.push(coords[0].slice());
        }
        return coords;
      }
      function getFeature(layer, newGeometry) {
        return layer.feature ? extend({}, layer.feature, { geometry: newGeometry }) : asFeature(newGeometry);
      }
      function asFeature(geojson) {
        if (geojson.type === "Feature" || geojson.type === "FeatureCollection") {
          return geojson;
        }
        return {
          type: "Feature",
          properties: {},
          geometry: geojson
        };
      }
      var PointToGeoJSON = {
        toGeoJSON: function(precision) {
          return getFeature(this, {
            type: "Point",
            coordinates: latLngToCoords(this.getLatLng(), precision)
          });
        }
      };
      Marker.include(PointToGeoJSON);
      Circle.include(PointToGeoJSON);
      CircleMarker.include(PointToGeoJSON);
      Polyline.include({
        toGeoJSON: function(precision) {
          var multi = !isFlat(this._latlngs);
          var coords = latLngsToCoords(this._latlngs, multi ? 1 : 0, false, precision);
          return getFeature(this, {
            type: (multi ? "Multi" : "") + "LineString",
            coordinates: coords
          });
        }
      });
      Polygon.include({
        toGeoJSON: function(precision) {
          var holes = !isFlat(this._latlngs), multi = holes && !isFlat(this._latlngs[0]);
          var coords = latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true, precision);
          if (!holes) {
            coords = [coords];
          }
          return getFeature(this, {
            type: (multi ? "Multi" : "") + "Polygon",
            coordinates: coords
          });
        }
      });
      LayerGroup.include({
        toMultiPoint: function(precision) {
          var coords = [];
          this.eachLayer(function(layer) {
            coords.push(layer.toGeoJSON(precision).geometry.coordinates);
          });
          return getFeature(this, {
            type: "MultiPoint",
            coordinates: coords
          });
        },
        // @method toGeoJSON(precision?: Number|false): Object
        // Coordinates values are rounded with [`formatNum`](#util-formatnum) function with given `precision`.
        // Returns a [`GeoJSON`](https://en.wikipedia.org/wiki/GeoJSON) representation of the layer group (as a GeoJSON `FeatureCollection`, `GeometryCollection`, or `MultiPoint`).
        toGeoJSON: function(precision) {
          var type = this.feature && this.feature.geometry && this.feature.geometry.type;
          if (type === "MultiPoint") {
            return this.toMultiPoint(precision);
          }
          var isGeometryCollection = type === "GeometryCollection", jsons = [];
          this.eachLayer(function(layer) {
            if (layer.toGeoJSON) {
              var json = layer.toGeoJSON(precision);
              if (isGeometryCollection) {
                jsons.push(json.geometry);
              } else {
                var feature = asFeature(json);
                if (feature.type === "FeatureCollection") {
                  jsons.push.apply(jsons, feature.features);
                } else {
                  jsons.push(feature);
                }
              }
            }
          });
          if (isGeometryCollection) {
            return getFeature(this, {
              geometries: jsons,
              type: "GeometryCollection"
            });
          }
          return {
            type: "FeatureCollection",
            features: jsons
          };
        }
      });
      function geoJSON(geojson, options) {
        return new GeoJSON(geojson, options);
      }
      var geoJson = geoJSON;
      var ImageOverlay = Layer.extend({
        // @section
        // @aka ImageOverlay options
        options: {
          // @option opacity: Number = 1.0
          // The opacity of the image overlay.
          opacity: 1,
          // @option alt: String = ''
          // Text for the `alt` attribute of the image (useful for accessibility).
          alt: "",
          // @option interactive: Boolean = false
          // If `true`, the image overlay will emit [mouse events](#interactive-layer) when clicked or hovered.
          interactive: false,
          // @option crossOrigin: Boolean|String = false
          // Whether the crossOrigin attribute will be added to the image.
          // If a String is provided, the image will have its crossOrigin attribute set to the String provided. This is needed if you want to access image pixel data.
          // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
          crossOrigin: false,
          // @option errorOverlayUrl: String = ''
          // URL to the overlay image to show in place of the overlay that failed to load.
          errorOverlayUrl: "",
          // @option zIndex: Number = 1
          // The explicit [zIndex](https://developer.mozilla.org/docs/Web/CSS/CSS_Positioning/Understanding_z_index) of the overlay layer.
          zIndex: 1,
          // @option className: String = ''
          // A custom class name to assign to the image. Empty by default.
          className: ""
        },
        initialize: function(url, bounds, options) {
          this._url = url;
          this._bounds = toLatLngBounds(bounds);
          setOptions(this, options);
        },
        onAdd: function() {
          if (!this._image) {
            this._initImage();
            if (this.options.opacity < 1) {
              this._updateOpacity();
            }
          }
          if (this.options.interactive) {
            addClass(this._image, "leaflet-interactive");
            this.addInteractiveTarget(this._image);
          }
          this.getPane().appendChild(this._image);
          this._reset();
        },
        onRemove: function() {
          remove(this._image);
          if (this.options.interactive) {
            this.removeInteractiveTarget(this._image);
          }
        },
        // @method setOpacity(opacity: Number): this
        // Sets the opacity of the overlay.
        setOpacity: function(opacity) {
          this.options.opacity = opacity;
          if (this._image) {
            this._updateOpacity();
          }
          return this;
        },
        setStyle: function(styleOpts) {
          if (styleOpts.opacity) {
            this.setOpacity(styleOpts.opacity);
          }
          return this;
        },
        // @method bringToFront(): this
        // Brings the layer to the top of all overlays.
        bringToFront: function() {
          if (this._map) {
            toFront(this._image);
          }
          return this;
        },
        // @method bringToBack(): this
        // Brings the layer to the bottom of all overlays.
        bringToBack: function() {
          if (this._map) {
            toBack(this._image);
          }
          return this;
        },
        // @method setUrl(url: String): this
        // Changes the URL of the image.
        setUrl: function(url) {
          this._url = url;
          if (this._image) {
            this._image.src = url;
          }
          return this;
        },
        // @method setBounds(bounds: LatLngBounds): this
        // Update the bounds that this ImageOverlay covers
        setBounds: function(bounds) {
          this._bounds = toLatLngBounds(bounds);
          if (this._map) {
            this._reset();
          }
          return this;
        },
        getEvents: function() {
          var events = {
            zoom: this._reset,
            viewreset: this._reset
          };
          if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
          }
          return events;
        },
        // @method setZIndex(value: Number): this
        // Changes the [zIndex](#imageoverlay-zindex) of the image overlay.
        setZIndex: function(value) {
          this.options.zIndex = value;
          this._updateZIndex();
          return this;
        },
        // @method getBounds(): LatLngBounds
        // Get the bounds that this ImageOverlay covers
        getBounds: function() {
          return this._bounds;
        },
        // @method getElement(): HTMLElement
        // Returns the instance of [`HTMLImageElement`](https://developer.mozilla.org/docs/Web/API/HTMLImageElement)
        // used by this overlay.
        getElement: function() {
          return this._image;
        },
        _initImage: function() {
          var wasElementSupplied = this._url.tagName === "IMG";
          var img = this._image = wasElementSupplied ? this._url : create$1("img");
          addClass(img, "leaflet-image-layer");
          if (this._zoomAnimated) {
            addClass(img, "leaflet-zoom-animated");
          }
          if (this.options.className) {
            addClass(img, this.options.className);
          }
          img.onselectstart = falseFn;
          img.onmousemove = falseFn;
          img.onload = bind(this.fire, this, "load");
          img.onerror = bind(this._overlayOnError, this, "error");
          if (this.options.crossOrigin || this.options.crossOrigin === "") {
            img.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
          }
          if (this.options.zIndex) {
            this._updateZIndex();
          }
          if (wasElementSupplied) {
            this._url = img.src;
            return;
          }
          img.src = this._url;
          img.alt = this.options.alt;
        },
        _animateZoom: function(e2) {
          var scale2 = this._map.getZoomScale(e2.zoom), offset = this._map._latLngBoundsToNewLayerBounds(this._bounds, e2.zoom, e2.center).min;
          setTransform(this._image, offset, scale2);
        },
        _reset: function() {
          var image = this._image, bounds = new Bounds(
            this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
            this._map.latLngToLayerPoint(this._bounds.getSouthEast())
          ), size = bounds.getSize();
          setPosition(image, bounds.min);
          image.style.width = size.x + "px";
          image.style.height = size.y + "px";
        },
        _updateOpacity: function() {
          setOpacity(this._image, this.options.opacity);
        },
        _updateZIndex: function() {
          if (this._image && this.options.zIndex !== void 0 && this.options.zIndex !== null) {
            this._image.style.zIndex = this.options.zIndex;
          }
        },
        _overlayOnError: function() {
          this.fire("error");
          var errorUrl = this.options.errorOverlayUrl;
          if (errorUrl && this._url !== errorUrl) {
            this._url = errorUrl;
            this._image.src = errorUrl;
          }
        },
        // @method getCenter(): LatLng
        // Returns the center of the ImageOverlay.
        getCenter: function() {
          return this._bounds.getCenter();
        }
      });
      var imageOverlay = function(url, bounds, options) {
        return new ImageOverlay(url, bounds, options);
      };
      var VideoOverlay = ImageOverlay.extend({
        // @section
        // @aka VideoOverlay options
        options: {
          // @option autoplay: Boolean = true
          // Whether the video starts playing automatically when loaded.
          // On some browsers autoplay will only work with `muted: true`
          autoplay: true,
          // @option loop: Boolean = true
          // Whether the video will loop back to the beginning when played.
          loop: true,
          // @option keepAspectRatio: Boolean = true
          // Whether the video will save aspect ratio after the projection.
          // Relevant for supported browsers. See [browser compatibility](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit)
          keepAspectRatio: true,
          // @option muted: Boolean = false
          // Whether the video starts on mute when loaded.
          muted: false,
          // @option playsInline: Boolean = true
          // Mobile browsers will play the video right where it is instead of open it up in fullscreen mode.
          playsInline: true
        },
        _initImage: function() {
          var wasElementSupplied = this._url.tagName === "VIDEO";
          var vid = this._image = wasElementSupplied ? this._url : create$1("video");
          addClass(vid, "leaflet-image-layer");
          if (this._zoomAnimated) {
            addClass(vid, "leaflet-zoom-animated");
          }
          if (this.options.className) {
            addClass(vid, this.options.className);
          }
          vid.onselectstart = falseFn;
          vid.onmousemove = falseFn;
          vid.onloadeddata = bind(this.fire, this, "load");
          if (wasElementSupplied) {
            var sourceElements = vid.getElementsByTagName("source");
            var sources = [];
            for (var j2 = 0; j2 < sourceElements.length; j2++) {
              sources.push(sourceElements[j2].src);
            }
            this._url = sourceElements.length > 0 ? sources : [vid.src];
            return;
          }
          if (!isArray(this._url)) {
            this._url = [this._url];
          }
          if (!this.options.keepAspectRatio && Object.prototype.hasOwnProperty.call(vid.style, "objectFit")) {
            vid.style["objectFit"] = "fill";
          }
          vid.autoplay = !!this.options.autoplay;
          vid.loop = !!this.options.loop;
          vid.muted = !!this.options.muted;
          vid.playsInline = !!this.options.playsInline;
          for (var i2 = 0; i2 < this._url.length; i2++) {
            var source = create$1("source");
            source.src = this._url[i2];
            vid.appendChild(source);
          }
        }
        // @method getElement(): HTMLVideoElement
        // Returns the instance of [`HTMLVideoElement`](https://developer.mozilla.org/docs/Web/API/HTMLVideoElement)
        // used by this overlay.
      });
      function videoOverlay(video, bounds, options) {
        return new VideoOverlay(video, bounds, options);
      }
      var SVGOverlay = ImageOverlay.extend({
        _initImage: function() {
          var el = this._image = this._url;
          addClass(el, "leaflet-image-layer");
          if (this._zoomAnimated) {
            addClass(el, "leaflet-zoom-animated");
          }
          if (this.options.className) {
            addClass(el, this.options.className);
          }
          el.onselectstart = falseFn;
          el.onmousemove = falseFn;
        }
        // @method getElement(): SVGElement
        // Returns the instance of [`SVGElement`](https://developer.mozilla.org/docs/Web/API/SVGElement)
        // used by this overlay.
      });
      function svgOverlay(el, bounds, options) {
        return new SVGOverlay(el, bounds, options);
      }
      var DivOverlay = Layer.extend({
        // @section
        // @aka DivOverlay options
        options: {
          // @option interactive: Boolean = false
          // If true, the popup/tooltip will listen to the mouse events.
          interactive: false,
          // @option offset: Point = Point(0, 0)
          // The offset of the overlay position.
          offset: [0, 0],
          // @option className: String = ''
          // A custom CSS class name to assign to the overlay.
          className: "",
          // @option pane: String = undefined
          // `Map pane` where the overlay will be added.
          pane: void 0,
          // @option content: String|HTMLElement|Function = ''
          // Sets the HTML content of the overlay while initializing. If a function is passed the source layer will be
          // passed to the function. The function should return a `String` or `HTMLElement` to be used in the overlay.
          content: ""
        },
        initialize: function(options, source) {
          if (options && (options instanceof LatLng || isArray(options))) {
            this._latlng = toLatLng(options);
            setOptions(this, source);
          } else {
            setOptions(this, options);
            this._source = source;
          }
          if (this.options.content) {
            this._content = this.options.content;
          }
        },
        // @method openOn(map: Map): this
        // Adds the overlay to the map.
        // Alternative to `map.openPopup(popup)`/`.openTooltip(tooltip)`.
        openOn: function(map2) {
          map2 = arguments.length ? map2 : this._source._map;
          if (!map2.hasLayer(this)) {
            map2.addLayer(this);
          }
          return this;
        },
        // @method close(): this
        // Closes the overlay.
        // Alternative to `map.closePopup(popup)`/`.closeTooltip(tooltip)`
        // and `layer.closePopup()`/`.closeTooltip()`.
        close: function() {
          if (this._map) {
            this._map.removeLayer(this);
          }
          return this;
        },
        // @method toggle(layer?: Layer): this
        // Opens or closes the overlay bound to layer depending on its current state.
        // Argument may be omitted only for overlay bound to layer.
        // Alternative to `layer.togglePopup()`/`.toggleTooltip()`.
        toggle: function(layer) {
          if (this._map) {
            this.close();
          } else {
            if (arguments.length) {
              this._source = layer;
            } else {
              layer = this._source;
            }
            this._prepareOpen();
            this.openOn(layer._map);
          }
          return this;
        },
        onAdd: function(map2) {
          this._zoomAnimated = map2._zoomAnimated;
          if (!this._container) {
            this._initLayout();
          }
          if (map2._fadeAnimated) {
            setOpacity(this._container, 0);
          }
          clearTimeout(this._removeTimeout);
          this.getPane().appendChild(this._container);
          this.update();
          if (map2._fadeAnimated) {
            setOpacity(this._container, 1);
          }
          this.bringToFront();
          if (this.options.interactive) {
            addClass(this._container, "leaflet-interactive");
            this.addInteractiveTarget(this._container);
          }
        },
        onRemove: function(map2) {
          if (map2._fadeAnimated) {
            setOpacity(this._container, 0);
            this._removeTimeout = setTimeout(bind(remove, void 0, this._container), 200);
          } else {
            remove(this._container);
          }
          if (this.options.interactive) {
            removeClass(this._container, "leaflet-interactive");
            this.removeInteractiveTarget(this._container);
          }
        },
        // @namespace DivOverlay
        // @method getLatLng: LatLng
        // Returns the geographical point of the overlay.
        getLatLng: function() {
          return this._latlng;
        },
        // @method setLatLng(latlng: LatLng): this
        // Sets the geographical point where the overlay will open.
        setLatLng: function(latlng) {
          this._latlng = toLatLng(latlng);
          if (this._map) {
            this._updatePosition();
            this._adjustPan();
          }
          return this;
        },
        // @method getContent: String|HTMLElement
        // Returns the content of the overlay.
        getContent: function() {
          return this._content;
        },
        // @method setContent(htmlContent: String|HTMLElement|Function): this
        // Sets the HTML content of the overlay. If a function is passed the source layer will be passed to the function.
        // The function should return a `String` or `HTMLElement` to be used in the overlay.
        setContent: function(content) {
          this._content = content;
          this.update();
          return this;
        },
        // @method getElement: String|HTMLElement
        // Returns the HTML container of the overlay.
        getElement: function() {
          return this._container;
        },
        // @method update: null
        // Updates the overlay content, layout and position. Useful for updating the overlay after something inside changed, e.g. image loaded.
        update: function() {
          if (!this._map) {
            return;
          }
          this._container.style.visibility = "hidden";
          this._updateContent();
          this._updateLayout();
          this._updatePosition();
          this._container.style.visibility = "";
          this._adjustPan();
        },
        getEvents: function() {
          var events = {
            zoom: this._updatePosition,
            viewreset: this._updatePosition
          };
          if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
          }
          return events;
        },
        // @method isOpen: Boolean
        // Returns `true` when the overlay is visible on the map.
        isOpen: function() {
          return !!this._map && this._map.hasLayer(this);
        },
        // @method bringToFront: this
        // Brings this overlay in front of other overlays (in the same map pane).
        bringToFront: function() {
          if (this._map) {
            toFront(this._container);
          }
          return this;
        },
        // @method bringToBack: this
        // Brings this overlay to the back of other overlays (in the same map pane).
        bringToBack: function() {
          if (this._map) {
            toBack(this._container);
          }
          return this;
        },
        // prepare bound overlay to open: update latlng pos / content source (for FeatureGroup)
        _prepareOpen: function(latlng) {
          var source = this._source;
          if (!source._map) {
            return false;
          }
          if (source instanceof FeatureGroup) {
            source = null;
            var layers2 = this._source._layers;
            for (var id in layers2) {
              if (layers2[id]._map) {
                source = layers2[id];
                break;
              }
            }
            if (!source) {
              return false;
            }
            this._source = source;
          }
          if (!latlng) {
            if (source.getCenter) {
              latlng = source.getCenter();
            } else if (source.getLatLng) {
              latlng = source.getLatLng();
            } else if (source.getBounds) {
              latlng = source.getBounds().getCenter();
            } else {
              throw new Error("Unable to get source layer LatLng.");
            }
          }
          this.setLatLng(latlng);
          if (this._map) {
            this.update();
          }
          return true;
        },
        _updateContent: function() {
          if (!this._content) {
            return;
          }
          var node = this._contentNode;
          var content = typeof this._content === "function" ? this._content(this._source || this) : this._content;
          if (typeof content === "string") {
            node.innerHTML = content;
          } else {
            while (node.hasChildNodes()) {
              node.removeChild(node.firstChild);
            }
            node.appendChild(content);
          }
          this.fire("contentupdate");
        },
        _updatePosition: function() {
          if (!this._map) {
            return;
          }
          var pos = this._map.latLngToLayerPoint(this._latlng), offset = toPoint(this.options.offset), anchor = this._getAnchor();
          if (this._zoomAnimated) {
            setPosition(this._container, pos.add(anchor));
          } else {
            offset = offset.add(pos).add(anchor);
          }
          var bottom = this._containerBottom = -offset.y, left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;
          this._container.style.bottom = bottom + "px";
          this._container.style.left = left + "px";
        },
        _getAnchor: function() {
          return [0, 0];
        }
      });
      Map2.include({
        _initOverlay: function(OverlayClass, content, latlng, options) {
          var overlay = content;
          if (!(overlay instanceof OverlayClass)) {
            overlay = new OverlayClass(options).setContent(content);
          }
          if (latlng) {
            overlay.setLatLng(latlng);
          }
          return overlay;
        }
      });
      Layer.include({
        _initOverlay: function(OverlayClass, old, content, options) {
          var overlay = content;
          if (overlay instanceof OverlayClass) {
            setOptions(overlay, options);
            overlay._source = this;
          } else {
            overlay = old && !options ? old : new OverlayClass(options, this);
            overlay.setContent(content);
          }
          return overlay;
        }
      });
      var Popup = DivOverlay.extend({
        // @section
        // @aka Popup options
        options: {
          // @option pane: String = 'popupPane'
          // `Map pane` where the popup will be added.
          pane: "popupPane",
          // @option offset: Point = Point(0, 7)
          // The offset of the popup position.
          offset: [0, 7],
          // @option maxWidth: Number = 300
          // Max width of the popup, in pixels.
          maxWidth: 300,
          // @option minWidth: Number = 50
          // Min width of the popup, in pixels.
          minWidth: 50,
          // @option maxHeight: Number = null
          // If set, creates a scrollable container of the given height
          // inside a popup if its content exceeds it.
          // The scrollable container can be styled using the
          // `leaflet-popup-scrolled` CSS class selector.
          maxHeight: null,
          // @option autoPan: Boolean = true
          // Set it to `false` if you don't want the map to do panning animation
          // to fit the opened popup.
          autoPan: true,
          // @option autoPanPaddingTopLeft: Point = null
          // The margin between the popup and the top left corner of the map
          // view after autopanning was performed.
          autoPanPaddingTopLeft: null,
          // @option autoPanPaddingBottomRight: Point = null
          // The margin between the popup and the bottom right corner of the map
          // view after autopanning was performed.
          autoPanPaddingBottomRight: null,
          // @option autoPanPadding: Point = Point(5, 5)
          // Equivalent of setting both top left and bottom right autopan padding to the same value.
          autoPanPadding: [5, 5],
          // @option keepInView: Boolean = false
          // Set it to `true` if you want to prevent users from panning the popup
          // off of the screen while it is open.
          keepInView: false,
          // @option closeButton: Boolean = true
          // Controls the presence of a close button in the popup.
          closeButton: true,
          // @option autoClose: Boolean = true
          // Set it to `false` if you want to override the default behavior of
          // the popup closing when another popup is opened.
          autoClose: true,
          // @option closeOnEscapeKey: Boolean = true
          // Set it to `false` if you want to override the default behavior of
          // the ESC key for closing of the popup.
          closeOnEscapeKey: true,
          // @option closeOnClick: Boolean = *
          // Set it if you want to override the default behavior of the popup closing when user clicks
          // on the map. Defaults to the map's [`closePopupOnClick`](#map-closepopuponclick) option.
          // @option className: String = ''
          // A custom CSS class name to assign to the popup.
          className: ""
        },
        // @namespace Popup
        // @method openOn(map: Map): this
        // Alternative to `map.openPopup(popup)`.
        // Adds the popup to the map and closes the previous one.
        openOn: function(map2) {
          map2 = arguments.length ? map2 : this._source._map;
          if (!map2.hasLayer(this) && map2._popup && map2._popup.options.autoClose) {
            map2.removeLayer(map2._popup);
          }
          map2._popup = this;
          return DivOverlay.prototype.openOn.call(this, map2);
        },
        onAdd: function(map2) {
          DivOverlay.prototype.onAdd.call(this, map2);
          map2.fire("popupopen", { popup: this });
          if (this._source) {
            this._source.fire("popupopen", { popup: this }, true);
            if (!(this._source instanceof Path)) {
              this._source.on("preclick", stopPropagation);
            }
          }
        },
        onRemove: function(map2) {
          DivOverlay.prototype.onRemove.call(this, map2);
          map2.fire("popupclose", { popup: this });
          if (this._source) {
            this._source.fire("popupclose", { popup: this }, true);
            if (!(this._source instanceof Path)) {
              this._source.off("preclick", stopPropagation);
            }
          }
        },
        getEvents: function() {
          var events = DivOverlay.prototype.getEvents.call(this);
          if (this.options.closeOnClick !== void 0 ? this.options.closeOnClick : this._map.options.closePopupOnClick) {
            events.preclick = this.close;
          }
          if (this.options.keepInView) {
            events.moveend = this._adjustPan;
          }
          return events;
        },
        _initLayout: function() {
          var prefix = "leaflet-popup", container = this._container = create$1(
            "div",
            prefix + " " + (this.options.className || "") + " leaflet-zoom-animated"
          );
          var wrapper = this._wrapper = create$1("div", prefix + "-content-wrapper", container);
          this._contentNode = create$1("div", prefix + "-content", wrapper);
          disableClickPropagation(container);
          disableScrollPropagation(this._contentNode);
          on(container, "contextmenu", stopPropagation);
          this._tipContainer = create$1("div", prefix + "-tip-container", container);
          this._tip = create$1("div", prefix + "-tip", this._tipContainer);
          if (this.options.closeButton) {
            var closeButton = this._closeButton = create$1("a", prefix + "-close-button", container);
            closeButton.setAttribute("role", "button");
            closeButton.setAttribute("aria-label", "Close popup");
            closeButton.href = "#close";
            closeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';
            on(closeButton, "click", function(ev) {
              preventDefault(ev);
              this.close();
            }, this);
          }
        },
        _updateLayout: function() {
          var container = this._contentNode, style2 = container.style;
          style2.width = "";
          style2.whiteSpace = "nowrap";
          var width = container.offsetWidth;
          width = Math.min(width, this.options.maxWidth);
          width = Math.max(width, this.options.minWidth);
          style2.width = width + 1 + "px";
          style2.whiteSpace = "";
          style2.height = "";
          var height = container.offsetHeight, maxHeight = this.options.maxHeight, scrolledClass = "leaflet-popup-scrolled";
          if (maxHeight && height > maxHeight) {
            style2.height = maxHeight + "px";
            addClass(container, scrolledClass);
          } else {
            removeClass(container, scrolledClass);
          }
          this._containerWidth = this._container.offsetWidth;
        },
        _animateZoom: function(e2) {
          var pos = this._map._latLngToNewLayerPoint(this._latlng, e2.zoom, e2.center), anchor = this._getAnchor();
          setPosition(this._container, pos.add(anchor));
        },
        _adjustPan: function() {
          if (!this.options.autoPan) {
            return;
          }
          if (this._map._panAnim) {
            this._map._panAnim.stop();
          }
          if (this._autopanning) {
            this._autopanning = false;
            return;
          }
          var map2 = this._map, marginBottom = parseInt(getStyle(this._container, "marginBottom"), 10) || 0, containerHeight = this._container.offsetHeight + marginBottom, containerWidth = this._containerWidth, layerPos = new Point(this._containerLeft, -containerHeight - this._containerBottom);
          layerPos._add(getPosition(this._container));
          var containerPos = map2.layerPointToContainerPoint(layerPos), padding = toPoint(this.options.autoPanPadding), paddingTL = toPoint(this.options.autoPanPaddingTopLeft || padding), paddingBR = toPoint(this.options.autoPanPaddingBottomRight || padding), size = map2.getSize(), dx = 0, dy = 0;
          if (containerPos.x + containerWidth + paddingBR.x > size.x) {
            dx = containerPos.x + containerWidth - size.x + paddingBR.x;
          }
          if (containerPos.x - dx - paddingTL.x < 0) {
            dx = containerPos.x - paddingTL.x;
          }
          if (containerPos.y + containerHeight + paddingBR.y > size.y) {
            dy = containerPos.y + containerHeight - size.y + paddingBR.y;
          }
          if (containerPos.y - dy - paddingTL.y < 0) {
            dy = containerPos.y - paddingTL.y;
          }
          if (dx || dy) {
            if (this.options.keepInView) {
              this._autopanning = true;
            }
            map2.fire("autopanstart").panBy([dx, dy]);
          }
        },
        _getAnchor: function() {
          return toPoint(this._source && this._source._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
        }
      });
      var popup = function(options, source) {
        return new Popup(options, source);
      };
      Map2.mergeOptions({
        closePopupOnClick: true
      });
      Map2.include({
        // @method openPopup(popup: Popup): this
        // Opens the specified popup while closing the previously opened (to make sure only one is opened at one time for usability).
        // @alternative
        // @method openPopup(content: String|HTMLElement, latlng: LatLng, options?: Popup options): this
        // Creates a popup with the specified content and options and opens it in the given point on a map.
        openPopup: function(popup2, latlng, options) {
          this._initOverlay(Popup, popup2, latlng, options).openOn(this);
          return this;
        },
        // @method closePopup(popup?: Popup): this
        // Closes the popup previously opened with [openPopup](#map-openpopup) (or the given one).
        closePopup: function(popup2) {
          popup2 = arguments.length ? popup2 : this._popup;
          if (popup2) {
            popup2.close();
          }
          return this;
        }
      });
      Layer.include({
        // @method bindPopup(content: String|HTMLElement|Function|Popup, options?: Popup options): this
        // Binds a popup to the layer with the passed `content` and sets up the
        // necessary event listeners. If a `Function` is passed it will receive
        // the layer as the first argument and should return a `String` or `HTMLElement`.
        bindPopup: function(content, options) {
          this._popup = this._initOverlay(Popup, this._popup, content, options);
          if (!this._popupHandlersAdded) {
            this.on({
              click: this._openPopup,
              keypress: this._onKeyPress,
              remove: this.closePopup,
              move: this._movePopup
            });
            this._popupHandlersAdded = true;
          }
          return this;
        },
        // @method unbindPopup(): this
        // Removes the popup previously bound with `bindPopup`.
        unbindPopup: function() {
          if (this._popup) {
            this.off({
              click: this._openPopup,
              keypress: this._onKeyPress,
              remove: this.closePopup,
              move: this._movePopup
            });
            this._popupHandlersAdded = false;
            this._popup = null;
          }
          return this;
        },
        // @method openPopup(latlng?: LatLng): this
        // Opens the bound popup at the specified `latlng` or at the default popup anchor if no `latlng` is passed.
        openPopup: function(latlng) {
          if (this._popup) {
            if (!(this instanceof FeatureGroup)) {
              this._popup._source = this;
            }
            if (this._popup._prepareOpen(latlng || this._latlng)) {
              this._popup.openOn(this._map);
            }
          }
          return this;
        },
        // @method closePopup(): this
        // Closes the popup bound to this layer if it is open.
        closePopup: function() {
          if (this._popup) {
            this._popup.close();
          }
          return this;
        },
        // @method togglePopup(): this
        // Opens or closes the popup bound to this layer depending on its current state.
        togglePopup: function() {
          if (this._popup) {
            this._popup.toggle(this);
          }
          return this;
        },
        // @method isPopupOpen(): boolean
        // Returns `true` if the popup bound to this layer is currently open.
        isPopupOpen: function() {
          return this._popup ? this._popup.isOpen() : false;
        },
        // @method setPopupContent(content: String|HTMLElement|Popup): this
        // Sets the content of the popup bound to this layer.
        setPopupContent: function(content) {
          if (this._popup) {
            this._popup.setContent(content);
          }
          return this;
        },
        // @method getPopup(): Popup
        // Returns the popup bound to this layer.
        getPopup: function() {
          return this._popup;
        },
        _openPopup: function(e2) {
          if (!this._popup || !this._map) {
            return;
          }
          stop(e2);
          var target = e2.layer || e2.target;
          if (this._popup._source === target && !(target instanceof Path)) {
            if (this._map.hasLayer(this._popup)) {
              this.closePopup();
            } else {
              this.openPopup(e2.latlng);
            }
            return;
          }
          this._popup._source = target;
          this.openPopup(e2.latlng);
        },
        _movePopup: function(e2) {
          this._popup.setLatLng(e2.latlng);
        },
        _onKeyPress: function(e2) {
          if (e2.originalEvent.keyCode === 13) {
            this._openPopup(e2);
          }
        }
      });
      var Tooltip = DivOverlay.extend({
        // @section
        // @aka Tooltip options
        options: {
          // @option pane: String = 'tooltipPane'
          // `Map pane` where the tooltip will be added.
          pane: "tooltipPane",
          // @option offset: Point = Point(0, 0)
          // Optional offset of the tooltip position.
          offset: [0, 0],
          // @option direction: String = 'auto'
          // Direction where to open the tooltip. Possible values are: `right`, `left`,
          // `top`, `bottom`, `center`, `auto`.
          // `auto` will dynamically switch between `right` and `left` according to the tooltip
          // position on the map.
          direction: "auto",
          // @option permanent: Boolean = false
          // Whether to open the tooltip permanently or only on mouseover.
          permanent: false,
          // @option sticky: Boolean = false
          // If true, the tooltip will follow the mouse instead of being fixed at the feature center.
          sticky: false,
          // @option opacity: Number = 0.9
          // Tooltip container opacity.
          opacity: 0.9
        },
        onAdd: function(map2) {
          DivOverlay.prototype.onAdd.call(this, map2);
          this.setOpacity(this.options.opacity);
          map2.fire("tooltipopen", { tooltip: this });
          if (this._source) {
            this.addEventParent(this._source);
            this._source.fire("tooltipopen", { tooltip: this }, true);
          }
        },
        onRemove: function(map2) {
          DivOverlay.prototype.onRemove.call(this, map2);
          map2.fire("tooltipclose", { tooltip: this });
          if (this._source) {
            this.removeEventParent(this._source);
            this._source.fire("tooltipclose", { tooltip: this }, true);
          }
        },
        getEvents: function() {
          var events = DivOverlay.prototype.getEvents.call(this);
          if (!this.options.permanent) {
            events.preclick = this.close;
          }
          return events;
        },
        _initLayout: function() {
          var prefix = "leaflet-tooltip", className = prefix + " " + (this.options.className || "") + " leaflet-zoom-" + (this._zoomAnimated ? "animated" : "hide");
          this._contentNode = this._container = create$1("div", className);
          this._container.setAttribute("role", "tooltip");
          this._container.setAttribute("id", "leaflet-tooltip-" + stamp(this));
        },
        _updateLayout: function() {
        },
        _adjustPan: function() {
        },
        _setPosition: function(pos) {
          var subX, subY, map2 = this._map, container = this._container, centerPoint = map2.latLngToContainerPoint(map2.getCenter()), tooltipPoint = map2.layerPointToContainerPoint(pos), direction = this.options.direction, tooltipWidth = container.offsetWidth, tooltipHeight = container.offsetHeight, offset = toPoint(this.options.offset), anchor = this._getAnchor();
          if (direction === "top") {
            subX = tooltipWidth / 2;
            subY = tooltipHeight;
          } else if (direction === "bottom") {
            subX = tooltipWidth / 2;
            subY = 0;
          } else if (direction === "center") {
            subX = tooltipWidth / 2;
            subY = tooltipHeight / 2;
          } else if (direction === "right") {
            subX = 0;
            subY = tooltipHeight / 2;
          } else if (direction === "left") {
            subX = tooltipWidth;
            subY = tooltipHeight / 2;
          } else if (tooltipPoint.x < centerPoint.x) {
            direction = "right";
            subX = 0;
            subY = tooltipHeight / 2;
          } else {
            direction = "left";
            subX = tooltipWidth + (offset.x + anchor.x) * 2;
            subY = tooltipHeight / 2;
          }
          pos = pos.subtract(toPoint(subX, subY, true)).add(offset).add(anchor);
          removeClass(container, "leaflet-tooltip-right");
          removeClass(container, "leaflet-tooltip-left");
          removeClass(container, "leaflet-tooltip-top");
          removeClass(container, "leaflet-tooltip-bottom");
          addClass(container, "leaflet-tooltip-" + direction);
          setPosition(container, pos);
        },
        _updatePosition: function() {
          var pos = this._map.latLngToLayerPoint(this._latlng);
          this._setPosition(pos);
        },
        setOpacity: function(opacity) {
          this.options.opacity = opacity;
          if (this._container) {
            setOpacity(this._container, opacity);
          }
        },
        _animateZoom: function(e2) {
          var pos = this._map._latLngToNewLayerPoint(this._latlng, e2.zoom, e2.center);
          this._setPosition(pos);
        },
        _getAnchor: function() {
          return toPoint(this._source && this._source._getTooltipAnchor && !this.options.sticky ? this._source._getTooltipAnchor() : [0, 0]);
        }
      });
      var tooltip = function(options, source) {
        return new Tooltip(options, source);
      };
      Map2.include({
        // @method openTooltip(tooltip: Tooltip): this
        // Opens the specified tooltip.
        // @alternative
        // @method openTooltip(content: String|HTMLElement, latlng: LatLng, options?: Tooltip options): this
        // Creates a tooltip with the specified content and options and open it.
        openTooltip: function(tooltip2, latlng, options) {
          this._initOverlay(Tooltip, tooltip2, latlng, options).openOn(this);
          return this;
        },
        // @method closeTooltip(tooltip: Tooltip): this
        // Closes the tooltip given as parameter.
        closeTooltip: function(tooltip2) {
          tooltip2.close();
          return this;
        }
      });
      Layer.include({
        // @method bindTooltip(content: String|HTMLElement|Function|Tooltip, options?: Tooltip options): this
        // Binds a tooltip to the layer with the passed `content` and sets up the
        // necessary event listeners. If a `Function` is passed it will receive
        // the layer as the first argument and should return a `String` or `HTMLElement`.
        bindTooltip: function(content, options) {
          if (this._tooltip && this.isTooltipOpen()) {
            this.unbindTooltip();
          }
          this._tooltip = this._initOverlay(Tooltip, this._tooltip, content, options);
          this._initTooltipInteractions();
          if (this._tooltip.options.permanent && this._map && this._map.hasLayer(this)) {
            this.openTooltip();
          }
          return this;
        },
        // @method unbindTooltip(): this
        // Removes the tooltip previously bound with `bindTooltip`.
        unbindTooltip: function() {
          if (this._tooltip) {
            this._initTooltipInteractions(true);
            this.closeTooltip();
            this._tooltip = null;
          }
          return this;
        },
        _initTooltipInteractions: function(remove2) {
          if (!remove2 && this._tooltipHandlersAdded) {
            return;
          }
          var onOff = remove2 ? "off" : "on", events = {
            remove: this.closeTooltip,
            move: this._moveTooltip
          };
          if (!this._tooltip.options.permanent) {
            events.mouseover = this._openTooltip;
            events.mouseout = this.closeTooltip;
            events.click = this._openTooltip;
            if (this._map) {
              this._addFocusListeners();
            } else {
              events.add = this._addFocusListeners;
            }
          } else {
            events.add = this._openTooltip;
          }
          if (this._tooltip.options.sticky) {
            events.mousemove = this._moveTooltip;
          }
          this[onOff](events);
          this._tooltipHandlersAdded = !remove2;
        },
        // @method openTooltip(latlng?: LatLng): this
        // Opens the bound tooltip at the specified `latlng` or at the default tooltip anchor if no `latlng` is passed.
        openTooltip: function(latlng) {
          if (this._tooltip) {
            if (!(this instanceof FeatureGroup)) {
              this._tooltip._source = this;
            }
            if (this._tooltip._prepareOpen(latlng)) {
              this._tooltip.openOn(this._map);
              if (this.getElement) {
                this._setAriaDescribedByOnLayer(this);
              } else if (this.eachLayer) {
                this.eachLayer(this._setAriaDescribedByOnLayer, this);
              }
            }
          }
          return this;
        },
        // @method closeTooltip(): this
        // Closes the tooltip bound to this layer if it is open.
        closeTooltip: function() {
          if (this._tooltip) {
            return this._tooltip.close();
          }
        },
        // @method toggleTooltip(): this
        // Opens or closes the tooltip bound to this layer depending on its current state.
        toggleTooltip: function() {
          if (this._tooltip) {
            this._tooltip.toggle(this);
          }
          return this;
        },
        // @method isTooltipOpen(): boolean
        // Returns `true` if the tooltip bound to this layer is currently open.
        isTooltipOpen: function() {
          return this._tooltip.isOpen();
        },
        // @method setTooltipContent(content: String|HTMLElement|Tooltip): this
        // Sets the content of the tooltip bound to this layer.
        setTooltipContent: function(content) {
          if (this._tooltip) {
            this._tooltip.setContent(content);
          }
          return this;
        },
        // @method getTooltip(): Tooltip
        // Returns the tooltip bound to this layer.
        getTooltip: function() {
          return this._tooltip;
        },
        _addFocusListeners: function() {
          if (this.getElement) {
            this._addFocusListenersOnLayer(this);
          } else if (this.eachLayer) {
            this.eachLayer(this._addFocusListenersOnLayer, this);
          }
        },
        _addFocusListenersOnLayer: function(layer) {
          var el = typeof layer.getElement === "function" && layer.getElement();
          if (el) {
            on(el, "focus", function() {
              this._tooltip._source = layer;
              this.openTooltip();
            }, this);
            on(el, "blur", this.closeTooltip, this);
          }
        },
        _setAriaDescribedByOnLayer: function(layer) {
          var el = typeof layer.getElement === "function" && layer.getElement();
          if (el) {
            el.setAttribute("aria-describedby", this._tooltip._container.id);
          }
        },
        _openTooltip: function(e2) {
          if (!this._tooltip || !this._map) {
            return;
          }
          if (this._map.dragging && this._map.dragging.moving() && !this._openOnceFlag) {
            this._openOnceFlag = true;
            var that = this;
            this._map.once("moveend", function() {
              that._openOnceFlag = false;
              that._openTooltip(e2);
            });
            return;
          }
          this._tooltip._source = e2.layer || e2.target;
          this.openTooltip(this._tooltip.options.sticky ? e2.latlng : void 0);
        },
        _moveTooltip: function(e2) {
          var latlng = e2.latlng, containerPoint, layerPoint;
          if (this._tooltip.options.sticky && e2.originalEvent) {
            containerPoint = this._map.mouseEventToContainerPoint(e2.originalEvent);
            layerPoint = this._map.containerPointToLayerPoint(containerPoint);
            latlng = this._map.layerPointToLatLng(layerPoint);
          }
          this._tooltip.setLatLng(latlng);
        }
      });
      var DivIcon = Icon2.extend({
        options: {
          // @section
          // @aka DivIcon options
          iconSize: [12, 12],
          // also can be set through CSS
          // iconAnchor: (Point),
          // popupAnchor: (Point),
          // @option html: String|HTMLElement = ''
          // Custom HTML code to put inside the div element, empty by default. Alternatively,
          // an instance of `HTMLElement`.
          html: false,
          // @option bgPos: Point = [0, 0]
          // Optional relative position of the background, in pixels
          bgPos: null,
          className: "leaflet-div-icon"
        },
        createIcon: function(oldIcon) {
          var div = oldIcon && oldIcon.tagName === "DIV" ? oldIcon : document.createElement("div"), options = this.options;
          if (options.html instanceof Element) {
            empty(div);
            div.appendChild(options.html);
          } else {
            div.innerHTML = options.html !== false ? options.html : "";
          }
          if (options.bgPos) {
            var bgPos = toPoint(options.bgPos);
            div.style.backgroundPosition = -bgPos.x + "px " + -bgPos.y + "px";
          }
          this._setIconStyles(div, "icon");
          return div;
        },
        createShadow: function() {
          return null;
        }
      });
      function divIcon2(options) {
        return new DivIcon(options);
      }
      Icon2.Default = IconDefault;
      var GridLayer = Layer.extend({
        // @section
        // @aka GridLayer options
        options: {
          // @option tileSize: Number|Point = 256
          // Width and height of tiles in the grid. Use a number if width and height are equal, or `L.point(width, height)` otherwise.
          tileSize: 256,
          // @option opacity: Number = 1.0
          // Opacity of the tiles. Can be used in the `createTile()` function.
          opacity: 1,
          // @option updateWhenIdle: Boolean = (depends)
          // Load new tiles only when panning ends.
          // `true` by default on mobile browsers, in order to avoid too many requests and keep smooth navigation.
          // `false` otherwise in order to display new tiles _during_ panning, since it is easy to pan outside the
          // [`keepBuffer`](#gridlayer-keepbuffer) option in desktop browsers.
          updateWhenIdle: Browser.mobile,
          // @option updateWhenZooming: Boolean = true
          // By default, a smooth zoom animation (during a [touch zoom](#map-touchzoom) or a [`flyTo()`](#map-flyto)) will update grid layers every integer zoom level. Setting this option to `false` will update the grid layer only when the smooth animation ends.
          updateWhenZooming: true,
          // @option updateInterval: Number = 200
          // Tiles will not update more than once every `updateInterval` milliseconds when panning.
          updateInterval: 200,
          // @option zIndex: Number = 1
          // The explicit zIndex of the tile layer.
          zIndex: 1,
          // @option bounds: LatLngBounds = undefined
          // If set, tiles will only be loaded inside the set `LatLngBounds`.
          bounds: null,
          // @option minZoom: Number = 0
          // The minimum zoom level down to which this layer will be displayed (inclusive).
          minZoom: 0,
          // @option maxZoom: Number = undefined
          // The maximum zoom level up to which this layer will be displayed (inclusive).
          maxZoom: void 0,
          // @option maxNativeZoom: Number = undefined
          // Maximum zoom number the tile source has available. If it is specified,
          // the tiles on all zoom levels higher than `maxNativeZoom` will be loaded
          // from `maxNativeZoom` level and auto-scaled.
          maxNativeZoom: void 0,
          // @option minNativeZoom: Number = undefined
          // Minimum zoom number the tile source has available. If it is specified,
          // the tiles on all zoom levels lower than `minNativeZoom` will be loaded
          // from `minNativeZoom` level and auto-scaled.
          minNativeZoom: void 0,
          // @option noWrap: Boolean = false
          // Whether the layer is wrapped around the antimeridian. If `true`, the
          // GridLayer will only be displayed once at low zoom levels. Has no
          // effect when the [map CRS](#map-crs) doesn't wrap around. Can be used
          // in combination with [`bounds`](#gridlayer-bounds) to prevent requesting
          // tiles outside the CRS limits.
          noWrap: false,
          // @option pane: String = 'tilePane'
          // `Map pane` where the grid layer will be added.
          pane: "tilePane",
          // @option className: String = ''
          // A custom class name to assign to the tile layer. Empty by default.
          className: "",
          // @option keepBuffer: Number = 2
          // When panning the map, keep this many rows and columns of tiles before unloading them.
          keepBuffer: 2
        },
        initialize: function(options) {
          setOptions(this, options);
        },
        onAdd: function() {
          this._initContainer();
          this._levels = {};
          this._tiles = {};
          this._resetView();
        },
        beforeAdd: function(map2) {
          map2._addZoomLimit(this);
        },
        onRemove: function(map2) {
          this._removeAllTiles();
          remove(this._container);
          map2._removeZoomLimit(this);
          this._container = null;
          this._tileZoom = void 0;
        },
        // @method bringToFront: this
        // Brings the tile layer to the top of all tile layers.
        bringToFront: function() {
          if (this._map) {
            toFront(this._container);
            this._setAutoZIndex(Math.max);
          }
          return this;
        },
        // @method bringToBack: this
        // Brings the tile layer to the bottom of all tile layers.
        bringToBack: function() {
          if (this._map) {
            toBack(this._container);
            this._setAutoZIndex(Math.min);
          }
          return this;
        },
        // @method getContainer: HTMLElement
        // Returns the HTML element that contains the tiles for this layer.
        getContainer: function() {
          return this._container;
        },
        // @method setOpacity(opacity: Number): this
        // Changes the [opacity](#gridlayer-opacity) of the grid layer.
        setOpacity: function(opacity) {
          this.options.opacity = opacity;
          this._updateOpacity();
          return this;
        },
        // @method setZIndex(zIndex: Number): this
        // Changes the [zIndex](#gridlayer-zindex) of the grid layer.
        setZIndex: function(zIndex) {
          this.options.zIndex = zIndex;
          this._updateZIndex();
          return this;
        },
        // @method isLoading: Boolean
        // Returns `true` if any tile in the grid layer has not finished loading.
        isLoading: function() {
          return this._loading;
        },
        // @method redraw: this
        // Causes the layer to clear all the tiles and request them again.
        redraw: function() {
          if (this._map) {
            this._removeAllTiles();
            var tileZoom = this._clampZoom(this._map.getZoom());
            if (tileZoom !== this._tileZoom) {
              this._tileZoom = tileZoom;
              this._updateLevels();
            }
            this._update();
          }
          return this;
        },
        getEvents: function() {
          var events = {
            viewprereset: this._invalidateAll,
            viewreset: this._resetView,
            zoom: this._resetView,
            moveend: this._onMoveEnd
          };
          if (!this.options.updateWhenIdle) {
            if (!this._onMove) {
              this._onMove = throttle(this._onMoveEnd, this.options.updateInterval, this);
            }
            events.move = this._onMove;
          }
          if (this._zoomAnimated) {
            events.zoomanim = this._animateZoom;
          }
          return events;
        },
        // @section Extension methods
        // Layers extending `GridLayer` shall reimplement the following method.
        // @method createTile(coords: Object, done?: Function): HTMLElement
        // Called only internally, must be overridden by classes extending `GridLayer`.
        // Returns the `HTMLElement` corresponding to the given `coords`. If the `done` callback
        // is specified, it must be called when the tile has finished loading and drawing.
        createTile: function() {
          return document.createElement("div");
        },
        // @section
        // @method getTileSize: Point
        // Normalizes the [tileSize option](#gridlayer-tilesize) into a point. Used by the `createTile()` method.
        getTileSize: function() {
          var s2 = this.options.tileSize;
          return s2 instanceof Point ? s2 : new Point(s2, s2);
        },
        _updateZIndex: function() {
          if (this._container && this.options.zIndex !== void 0 && this.options.zIndex !== null) {
            this._container.style.zIndex = this.options.zIndex;
          }
        },
        _setAutoZIndex: function(compare) {
          var layers2 = this.getPane().children, edgeZIndex = -compare(-Infinity, Infinity);
          for (var i2 = 0, len = layers2.length, zIndex; i2 < len; i2++) {
            zIndex = layers2[i2].style.zIndex;
            if (layers2[i2] !== this._container && zIndex) {
              edgeZIndex = compare(edgeZIndex, +zIndex);
            }
          }
          if (isFinite(edgeZIndex)) {
            this.options.zIndex = edgeZIndex + compare(-1, 1);
            this._updateZIndex();
          }
        },
        _updateOpacity: function() {
          if (!this._map) {
            return;
          }
          if (Browser.ielt9) {
            return;
          }
          setOpacity(this._container, this.options.opacity);
          var now = +/* @__PURE__ */ new Date(), nextFrame = false, willPrune = false;
          for (var key in this._tiles) {
            var tile = this._tiles[key];
            if (!tile.current || !tile.loaded) {
              continue;
            }
            var fade = Math.min(1, (now - tile.loaded) / 200);
            setOpacity(tile.el, fade);
            if (fade < 1) {
              nextFrame = true;
            } else {
              if (tile.active) {
                willPrune = true;
              } else {
                this._onOpaqueTile(tile);
              }
              tile.active = true;
            }
          }
          if (willPrune && !this._noPrune) {
            this._pruneTiles();
          }
          if (nextFrame) {
            cancelAnimFrame(this._fadeFrame);
            this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
          }
        },
        _onOpaqueTile: falseFn,
        _initContainer: function() {
          if (this._container) {
            return;
          }
          this._container = create$1("div", "leaflet-layer " + (this.options.className || ""));
          this._updateZIndex();
          if (this.options.opacity < 1) {
            this._updateOpacity();
          }
          this.getPane().appendChild(this._container);
        },
        _updateLevels: function() {
          var zoom2 = this._tileZoom, maxZoom = this.options.maxZoom;
          if (zoom2 === void 0) {
            return void 0;
          }
          for (var z2 in this._levels) {
            z2 = Number(z2);
            if (this._levels[z2].el.children.length || z2 === zoom2) {
              this._levels[z2].el.style.zIndex = maxZoom - Math.abs(zoom2 - z2);
              this._onUpdateLevel(z2);
            } else {
              remove(this._levels[z2].el);
              this._removeTilesAtZoom(z2);
              this._onRemoveLevel(z2);
              delete this._levels[z2];
            }
          }
          var level = this._levels[zoom2], map2 = this._map;
          if (!level) {
            level = this._levels[zoom2] = {};
            level.el = create$1("div", "leaflet-tile-container leaflet-zoom-animated", this._container);
            level.el.style.zIndex = maxZoom;
            level.origin = map2.project(map2.unproject(map2.getPixelOrigin()), zoom2).round();
            level.zoom = zoom2;
            this._setZoomTransform(level, map2.getCenter(), map2.getZoom());
            falseFn(level.el.offsetWidth);
            this._onCreateLevel(level);
          }
          this._level = level;
          return level;
        },
        _onUpdateLevel: falseFn,
        _onRemoveLevel: falseFn,
        _onCreateLevel: falseFn,
        _pruneTiles: function() {
          if (!this._map) {
            return;
          }
          var key, tile;
          var zoom2 = this._map.getZoom();
          if (zoom2 > this.options.maxZoom || zoom2 < this.options.minZoom) {
            this._removeAllTiles();
            return;
          }
          for (key in this._tiles) {
            tile = this._tiles[key];
            tile.retain = tile.current;
          }
          for (key in this._tiles) {
            tile = this._tiles[key];
            if (tile.current && !tile.active) {
              var coords = tile.coords;
              if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
                this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
              }
            }
          }
          for (key in this._tiles) {
            if (!this._tiles[key].retain) {
              this._removeTile(key);
            }
          }
        },
        _removeTilesAtZoom: function(zoom2) {
          for (var key in this._tiles) {
            if (this._tiles[key].coords.z !== zoom2) {
              continue;
            }
            this._removeTile(key);
          }
        },
        _removeAllTiles: function() {
          for (var key in this._tiles) {
            this._removeTile(key);
          }
        },
        _invalidateAll: function() {
          for (var z2 in this._levels) {
            remove(this._levels[z2].el);
            this._onRemoveLevel(Number(z2));
            delete this._levels[z2];
          }
          this._removeAllTiles();
          this._tileZoom = void 0;
        },
        _retainParent: function(x2, y2, z2, minZoom) {
          var x22 = Math.floor(x2 / 2), y22 = Math.floor(y2 / 2), z22 = z2 - 1, coords2 = new Point(+x22, +y22);
          coords2.z = +z22;
          var key = this._tileCoordsToKey(coords2), tile = this._tiles[key];
          if (tile && tile.active) {
            tile.retain = true;
            return true;
          } else if (tile && tile.loaded) {
            tile.retain = true;
          }
          if (z22 > minZoom) {
            return this._retainParent(x22, y22, z22, minZoom);
          }
          return false;
        },
        _retainChildren: function(x2, y2, z2, maxZoom) {
          for (var i2 = 2 * x2; i2 < 2 * x2 + 2; i2++) {
            for (var j2 = 2 * y2; j2 < 2 * y2 + 2; j2++) {
              var coords = new Point(i2, j2);
              coords.z = z2 + 1;
              var key = this._tileCoordsToKey(coords), tile = this._tiles[key];
              if (tile && tile.active) {
                tile.retain = true;
                continue;
              } else if (tile && tile.loaded) {
                tile.retain = true;
              }
              if (z2 + 1 < maxZoom) {
                this._retainChildren(i2, j2, z2 + 1, maxZoom);
              }
            }
          }
        },
        _resetView: function(e2) {
          var animating = e2 && (e2.pinch || e2.flyTo);
          this._setView(this._map.getCenter(), this._map.getZoom(), animating, animating);
        },
        _animateZoom: function(e2) {
          this._setView(e2.center, e2.zoom, true, e2.noUpdate);
        },
        _clampZoom: function(zoom2) {
          var options = this.options;
          if (void 0 !== options.minNativeZoom && zoom2 < options.minNativeZoom) {
            return options.minNativeZoom;
          }
          if (void 0 !== options.maxNativeZoom && options.maxNativeZoom < zoom2) {
            return options.maxNativeZoom;
          }
          return zoom2;
        },
        _setView: function(center, zoom2, noPrune, noUpdate) {
          var tileZoom = Math.round(zoom2);
          if (this.options.maxZoom !== void 0 && tileZoom > this.options.maxZoom || this.options.minZoom !== void 0 && tileZoom < this.options.minZoom) {
            tileZoom = void 0;
          } else {
            tileZoom = this._clampZoom(tileZoom);
          }
          var tileZoomChanged = this.options.updateWhenZooming && tileZoom !== this._tileZoom;
          if (!noUpdate || tileZoomChanged) {
            this._tileZoom = tileZoom;
            if (this._abortLoading) {
              this._abortLoading();
            }
            this._updateLevels();
            this._resetGrid();
            if (tileZoom !== void 0) {
              this._update(center);
            }
            if (!noPrune) {
              this._pruneTiles();
            }
            this._noPrune = !!noPrune;
          }
          this._setZoomTransforms(center, zoom2);
        },
        _setZoomTransforms: function(center, zoom2) {
          for (var i2 in this._levels) {
            this._setZoomTransform(this._levels[i2], center, zoom2);
          }
        },
        _setZoomTransform: function(level, center, zoom2) {
          var scale2 = this._map.getZoomScale(zoom2, level.zoom), translate = level.origin.multiplyBy(scale2).subtract(this._map._getNewPixelOrigin(center, zoom2)).round();
          if (Browser.any3d) {
            setTransform(level.el, translate, scale2);
          } else {
            setPosition(level.el, translate);
          }
        },
        _resetGrid: function() {
          var map2 = this._map, crs = map2.options.crs, tileSize = this._tileSize = this.getTileSize(), tileZoom = this._tileZoom;
          var bounds = this._map.getPixelWorldBounds(this._tileZoom);
          if (bounds) {
            this._globalTileRange = this._pxBoundsToTileRange(bounds);
          }
          this._wrapX = crs.wrapLng && !this.options.noWrap && [
            Math.floor(map2.project([0, crs.wrapLng[0]], tileZoom).x / tileSize.x),
            Math.ceil(map2.project([0, crs.wrapLng[1]], tileZoom).x / tileSize.y)
          ];
          this._wrapY = crs.wrapLat && !this.options.noWrap && [
            Math.floor(map2.project([crs.wrapLat[0], 0], tileZoom).y / tileSize.x),
            Math.ceil(map2.project([crs.wrapLat[1], 0], tileZoom).y / tileSize.y)
          ];
        },
        _onMoveEnd: function() {
          if (!this._map || this._map._animatingZoom) {
            return;
          }
          this._update();
        },
        _getTiledPixelBounds: function(center) {
          var map2 = this._map, mapZoom = map2._animatingZoom ? Math.max(map2._animateToZoom, map2.getZoom()) : map2.getZoom(), scale2 = map2.getZoomScale(mapZoom, this._tileZoom), pixelCenter = map2.project(center, this._tileZoom).floor(), halfSize = map2.getSize().divideBy(scale2 * 2);
          return new Bounds(pixelCenter.subtract(halfSize), pixelCenter.add(halfSize));
        },
        // Private method to load tiles in the grid's active zoom level according to map bounds
        _update: function(center) {
          var map2 = this._map;
          if (!map2) {
            return;
          }
          var zoom2 = this._clampZoom(map2.getZoom());
          if (center === void 0) {
            center = map2.getCenter();
          }
          if (this._tileZoom === void 0) {
            return;
          }
          var pixelBounds = this._getTiledPixelBounds(center), tileRange = this._pxBoundsToTileRange(pixelBounds), tileCenter = tileRange.getCenter(), queue = [], margin = this.options.keepBuffer, noPruneRange = new Bounds(
            tileRange.getBottomLeft().subtract([margin, -margin]),
            tileRange.getTopRight().add([margin, -margin])
          );
          if (!(isFinite(tileRange.min.x) && isFinite(tileRange.min.y) && isFinite(tileRange.max.x) && isFinite(tileRange.max.y))) {
            throw new Error("Attempted to load an infinite number of tiles");
          }
          for (var key in this._tiles) {
            var c2 = this._tiles[key].coords;
            if (c2.z !== this._tileZoom || !noPruneRange.contains(new Point(c2.x, c2.y))) {
              this._tiles[key].current = false;
            }
          }
          if (Math.abs(zoom2 - this._tileZoom) > 1) {
            this._setView(center, zoom2);
            return;
          }
          for (var j2 = tileRange.min.y; j2 <= tileRange.max.y; j2++) {
            for (var i2 = tileRange.min.x; i2 <= tileRange.max.x; i2++) {
              var coords = new Point(i2, j2);
              coords.z = this._tileZoom;
              if (!this._isValidTile(coords)) {
                continue;
              }
              var tile = this._tiles[this._tileCoordsToKey(coords)];
              if (tile) {
                tile.current = true;
              } else {
                queue.push(coords);
              }
            }
          }
          queue.sort(function(a2, b2) {
            return a2.distanceTo(tileCenter) - b2.distanceTo(tileCenter);
          });
          if (queue.length !== 0) {
            if (!this._loading) {
              this._loading = true;
              this.fire("loading");
            }
            var fragment = document.createDocumentFragment();
            for (i2 = 0; i2 < queue.length; i2++) {
              this._addTile(queue[i2], fragment);
            }
            this._level.el.appendChild(fragment);
          }
        },
        _isValidTile: function(coords) {
          var crs = this._map.options.crs;
          if (!crs.infinite) {
            var bounds = this._globalTileRange;
            if (!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x) || !crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y)) {
              return false;
            }
          }
          if (!this.options.bounds) {
            return true;
          }
          var tileBounds = this._tileCoordsToBounds(coords);
          return toLatLngBounds(this.options.bounds).overlaps(tileBounds);
        },
        _keyToBounds: function(key) {
          return this._tileCoordsToBounds(this._keyToTileCoords(key));
        },
        _tileCoordsToNwSe: function(coords) {
          var map2 = this._map, tileSize = this.getTileSize(), nwPoint = coords.scaleBy(tileSize), sePoint = nwPoint.add(tileSize), nw = map2.unproject(nwPoint, coords.z), se2 = map2.unproject(sePoint, coords.z);
          return [nw, se2];
        },
        // converts tile coordinates to its geographical bounds
        _tileCoordsToBounds: function(coords) {
          var bp = this._tileCoordsToNwSe(coords), bounds = new LatLngBounds(bp[0], bp[1]);
          if (!this.options.noWrap) {
            bounds = this._map.wrapLatLngBounds(bounds);
          }
          return bounds;
        },
        // converts tile coordinates to key for the tile cache
        _tileCoordsToKey: function(coords) {
          return coords.x + ":" + coords.y + ":" + coords.z;
        },
        // converts tile cache key to coordinates
        _keyToTileCoords: function(key) {
          var k2 = key.split(":"), coords = new Point(+k2[0], +k2[1]);
          coords.z = +k2[2];
          return coords;
        },
        _removeTile: function(key) {
          var tile = this._tiles[key];
          if (!tile) {
            return;
          }
          remove(tile.el);
          delete this._tiles[key];
          this.fire("tileunload", {
            tile: tile.el,
            coords: this._keyToTileCoords(key)
          });
        },
        _initTile: function(tile) {
          addClass(tile, "leaflet-tile");
          var tileSize = this.getTileSize();
          tile.style.width = tileSize.x + "px";
          tile.style.height = tileSize.y + "px";
          tile.onselectstart = falseFn;
          tile.onmousemove = falseFn;
          if (Browser.ielt9 && this.options.opacity < 1) {
            setOpacity(tile, this.options.opacity);
          }
        },
        _addTile: function(coords, container) {
          var tilePos = this._getTilePos(coords), key = this._tileCoordsToKey(coords);
          var tile = this.createTile(this._wrapCoords(coords), bind(this._tileReady, this, coords));
          this._initTile(tile);
          if (this.createTile.length < 2) {
            requestAnimFrame(bind(this._tileReady, this, coords, null, tile));
          }
          setPosition(tile, tilePos);
          this._tiles[key] = {
            el: tile,
            coords,
            current: true
          };
          container.appendChild(tile);
          this.fire("tileloadstart", {
            tile,
            coords
          });
        },
        _tileReady: function(coords, err, tile) {
          if (err) {
            this.fire("tileerror", {
              error: err,
              tile,
              coords
            });
          }
          var key = this._tileCoordsToKey(coords);
          tile = this._tiles[key];
          if (!tile) {
            return;
          }
          tile.loaded = +/* @__PURE__ */ new Date();
          if (this._map._fadeAnimated) {
            setOpacity(tile.el, 0);
            cancelAnimFrame(this._fadeFrame);
            this._fadeFrame = requestAnimFrame(this._updateOpacity, this);
          } else {
            tile.active = true;
            this._pruneTiles();
          }
          if (!err) {
            addClass(tile.el, "leaflet-tile-loaded");
            this.fire("tileload", {
              tile: tile.el,
              coords
            });
          }
          if (this._noTilesToLoad()) {
            this._loading = false;
            this.fire("load");
            if (Browser.ielt9 || !this._map._fadeAnimated) {
              requestAnimFrame(this._pruneTiles, this);
            } else {
              setTimeout(bind(this._pruneTiles, this), 250);
            }
          }
        },
        _getTilePos: function(coords) {
          return coords.scaleBy(this.getTileSize()).subtract(this._level.origin);
        },
        _wrapCoords: function(coords) {
          var newCoords = new Point(
            this._wrapX ? wrapNum(coords.x, this._wrapX) : coords.x,
            this._wrapY ? wrapNum(coords.y, this._wrapY) : coords.y
          );
          newCoords.z = coords.z;
          return newCoords;
        },
        _pxBoundsToTileRange: function(bounds) {
          var tileSize = this.getTileSize();
          return new Bounds(
            bounds.min.unscaleBy(tileSize).floor(),
            bounds.max.unscaleBy(tileSize).ceil().subtract([1, 1])
          );
        },
        _noTilesToLoad: function() {
          for (var key in this._tiles) {
            if (!this._tiles[key].loaded) {
              return false;
            }
          }
          return true;
        }
      });
      function gridLayer(options) {
        return new GridLayer(options);
      }
      var TileLayer = GridLayer.extend({
        // @section
        // @aka TileLayer options
        options: {
          // @option minZoom: Number = 0
          // The minimum zoom level down to which this layer will be displayed (inclusive).
          minZoom: 0,
          // @option maxZoom: Number = 18
          // The maximum zoom level up to which this layer will be displayed (inclusive).
          maxZoom: 18,
          // @option subdomains: String|String[] = 'abc'
          // Subdomains of the tile service. Can be passed in the form of one string (where each letter is a subdomain name) or an array of strings.
          subdomains: "abc",
          // @option errorTileUrl: String = ''
          // URL to the tile image to show in place of the tile that failed to load.
          errorTileUrl: "",
          // @option zoomOffset: Number = 0
          // The zoom number used in tile URLs will be offset with this value.
          zoomOffset: 0,
          // @option tms: Boolean = false
          // If `true`, inverses Y axis numbering for tiles (turn this on for [TMS](https://en.wikipedia.org/wiki/Tile_Map_Service) services).
          tms: false,
          // @option zoomReverse: Boolean = false
          // If set to true, the zoom number used in tile URLs will be reversed (`maxZoom - zoom` instead of `zoom`)
          zoomReverse: false,
          // @option detectRetina: Boolean = false
          // If `true` and user is on a retina display, it will request four tiles of half the specified size and a bigger zoom level in place of one to utilize the high resolution.
          detectRetina: false,
          // @option crossOrigin: Boolean|String = false
          // Whether the crossOrigin attribute will be added to the tiles.
          // If a String is provided, all tiles will have their crossOrigin attribute set to the String provided. This is needed if you want to access tile pixel data.
          // Refer to [CORS Settings](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes) for valid String values.
          crossOrigin: false,
          // @option referrerPolicy: Boolean|String = false
          // Whether the referrerPolicy attribute will be added to the tiles.
          // If a String is provided, all tiles will have their referrerPolicy attribute set to the String provided.
          // This may be needed if your map's rendering context has a strict default but your tile provider expects a valid referrer
          // (e.g. to validate an API token).
          // Refer to [HTMLImageElement.referrerPolicy](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/referrerPolicy) for valid String values.
          referrerPolicy: false
        },
        initialize: function(url, options) {
          this._url = url;
          options = setOptions(this, options);
          if (options.detectRetina && Browser.retina && options.maxZoom > 0) {
            options.tileSize = Math.floor(options.tileSize / 2);
            if (!options.zoomReverse) {
              options.zoomOffset++;
              options.maxZoom = Math.max(options.minZoom, options.maxZoom - 1);
            } else {
              options.zoomOffset--;
              options.minZoom = Math.min(options.maxZoom, options.minZoom + 1);
            }
            options.minZoom = Math.max(0, options.minZoom);
          } else if (!options.zoomReverse) {
            options.maxZoom = Math.max(options.minZoom, options.maxZoom);
          } else {
            options.minZoom = Math.min(options.maxZoom, options.minZoom);
          }
          if (typeof options.subdomains === "string") {
            options.subdomains = options.subdomains.split("");
          }
          this.on("tileunload", this._onTileRemove);
        },
        // @method setUrl(url: String, noRedraw?: Boolean): this
        // Updates the layer's URL template and redraws it (unless `noRedraw` is set to `true`).
        // If the URL does not change, the layer will not be redrawn unless
        // the noRedraw parameter is set to false.
        setUrl: function(url, noRedraw) {
          if (this._url === url && noRedraw === void 0) {
            noRedraw = true;
          }
          this._url = url;
          if (!noRedraw) {
            this.redraw();
          }
          return this;
        },
        // @method createTile(coords: Object, done?: Function): HTMLElement
        // Called only internally, overrides GridLayer's [`createTile()`](#gridlayer-createtile)
        // to return an `<img>` HTML element with the appropriate image URL given `coords`. The `done`
        // callback is called when the tile has been loaded.
        createTile: function(coords, done) {
          var tile = document.createElement("img");
          on(tile, "load", bind(this._tileOnLoad, this, done, tile));
          on(tile, "error", bind(this._tileOnError, this, done, tile));
          if (this.options.crossOrigin || this.options.crossOrigin === "") {
            tile.crossOrigin = this.options.crossOrigin === true ? "" : this.options.crossOrigin;
          }
          if (typeof this.options.referrerPolicy === "string") {
            tile.referrerPolicy = this.options.referrerPolicy;
          }
          tile.alt = "";
          tile.src = this.getTileUrl(coords);
          return tile;
        },
        // @section Extension methods
        // @uninheritable
        // Layers extending `TileLayer` might reimplement the following method.
        // @method getTileUrl(coords: Object): String
        // Called only internally, returns the URL for a tile given its coordinates.
        // Classes extending `TileLayer` can override this function to provide custom tile URL naming schemes.
        getTileUrl: function(coords) {
          var data = {
            r: Browser.retina ? "@2x" : "",
            s: this._getSubdomain(coords),
            x: coords.x,
            y: coords.y,
            z: this._getZoomForUrl()
          };
          if (this._map && !this._map.options.crs.infinite) {
            var invertedY = this._globalTileRange.max.y - coords.y;
            if (this.options.tms) {
              data["y"] = invertedY;
            }
            data["-y"] = invertedY;
          }
          return template(this._url, extend(data, this.options));
        },
        _tileOnLoad: function(done, tile) {
          if (Browser.ielt9) {
            setTimeout(bind(done, this, null, tile), 0);
          } else {
            done(null, tile);
          }
        },
        _tileOnError: function(done, tile, e2) {
          var errorUrl = this.options.errorTileUrl;
          if (errorUrl && tile.getAttribute("src") !== errorUrl) {
            tile.src = errorUrl;
          }
          done(e2, tile);
        },
        _onTileRemove: function(e2) {
          e2.tile.onload = null;
        },
        _getZoomForUrl: function() {
          var zoom2 = this._tileZoom, maxZoom = this.options.maxZoom, zoomReverse = this.options.zoomReverse, zoomOffset = this.options.zoomOffset;
          if (zoomReverse) {
            zoom2 = maxZoom - zoom2;
          }
          return zoom2 + zoomOffset;
        },
        _getSubdomain: function(tilePoint) {
          var index2 = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
          return this.options.subdomains[index2];
        },
        // stops loading all tiles in the background layer
        _abortLoading: function() {
          var i2, tile;
          for (i2 in this._tiles) {
            if (this._tiles[i2].coords.z !== this._tileZoom) {
              tile = this._tiles[i2].el;
              tile.onload = falseFn;
              tile.onerror = falseFn;
              if (!tile.complete) {
                tile.src = emptyImageUrl;
                var coords = this._tiles[i2].coords;
                remove(tile);
                delete this._tiles[i2];
                this.fire("tileabort", {
                  tile,
                  coords
                });
              }
            }
          }
        },
        _removeTile: function(key) {
          var tile = this._tiles[key];
          if (!tile) {
            return;
          }
          tile.el.setAttribute("src", emptyImageUrl);
          return GridLayer.prototype._removeTile.call(this, key);
        },
        _tileReady: function(coords, err, tile) {
          if (!this._map || tile && tile.getAttribute("src") === emptyImageUrl) {
            return;
          }
          return GridLayer.prototype._tileReady.call(this, coords, err, tile);
        }
      });
      function tileLayer2(url, options) {
        return new TileLayer(url, options);
      }
      var TileLayerWMS = TileLayer.extend({
        // @section
        // @aka TileLayer.WMS options
        // If any custom options not documented here are used, they will be sent to the
        // WMS server as extra parameters in each request URL. This can be useful for
        // [non-standard vendor WMS parameters](https://docs.geoserver.org/stable/en/user/services/wms/vendor.html).
        defaultWmsParams: {
          service: "WMS",
          request: "GetMap",
          // @option layers: String = ''
          // **(required)** Comma-separated list of WMS layers to show.
          layers: "",
          // @option styles: String = ''
          // Comma-separated list of WMS styles.
          styles: "",
          // @option format: String = 'image/jpeg'
          // WMS image format (use `'image/png'` for layers with transparency).
          format: "image/jpeg",
          // @option transparent: Boolean = false
          // If `true`, the WMS service will return images with transparency.
          transparent: false,
          // @option version: String = '1.1.1'
          // Version of the WMS service to use
          version: "1.1.1"
        },
        options: {
          // @option crs: CRS = null
          // Coordinate Reference System to use for the WMS requests, defaults to
          // map CRS. Don't change this if you're not sure what it means.
          crs: null,
          // @option uppercase: Boolean = false
          // If `true`, WMS request parameter keys will be uppercase.
          uppercase: false
        },
        initialize: function(url, options) {
          this._url = url;
          var wmsParams = extend({}, this.defaultWmsParams);
          for (var i2 in options) {
            if (!(i2 in this.options)) {
              wmsParams[i2] = options[i2];
            }
          }
          options = setOptions(this, options);
          var realRetina = options.detectRetina && Browser.retina ? 2 : 1;
          var tileSize = this.getTileSize();
          wmsParams.width = tileSize.x * realRetina;
          wmsParams.height = tileSize.y * realRetina;
          this.wmsParams = wmsParams;
        },
        onAdd: function(map2) {
          this._crs = this.options.crs || map2.options.crs;
          this._wmsVersion = parseFloat(this.wmsParams.version);
          var projectionKey = this._wmsVersion >= 1.3 ? "crs" : "srs";
          this.wmsParams[projectionKey] = this._crs.code;
          TileLayer.prototype.onAdd.call(this, map2);
        },
        getTileUrl: function(coords) {
          var tileBounds = this._tileCoordsToNwSe(coords), crs = this._crs, bounds = toBounds(crs.project(tileBounds[0]), crs.project(tileBounds[1])), min = bounds.min, max = bounds.max, bbox = (this._wmsVersion >= 1.3 && this._crs === EPSG4326 ? [min.y, min.x, max.y, max.x] : [min.x, min.y, max.x, max.y]).join(","), url = TileLayer.prototype.getTileUrl.call(this, coords);
          return url + getParamString(this.wmsParams, url, this.options.uppercase) + (this.options.uppercase ? "&BBOX=" : "&bbox=") + bbox;
        },
        // @method setParams(params: Object, noRedraw?: Boolean): this
        // Merges an object with the new parameters and re-requests tiles on the current screen (unless `noRedraw` was set to true).
        setParams: function(params, noRedraw) {
          extend(this.wmsParams, params);
          if (!noRedraw) {
            this.redraw();
          }
          return this;
        }
      });
      function tileLayerWMS(url, options) {
        return new TileLayerWMS(url, options);
      }
      TileLayer.WMS = TileLayerWMS;
      tileLayer2.wms = tileLayerWMS;
      var Renderer = Layer.extend({
        // @section
        // @aka Renderer options
        options: {
          // @option padding: Number = 0.1
          // How much to extend the clip area around the map view (relative to its size)
          // e.g. 0.1 would be 10% of map view in each direction
          padding: 0.1
        },
        initialize: function(options) {
          setOptions(this, options);
          stamp(this);
          this._layers = this._layers || {};
        },
        onAdd: function() {
          if (!this._container) {
            this._initContainer();
            addClass(this._container, "leaflet-zoom-animated");
          }
          this.getPane().appendChild(this._container);
          this._update();
          this.on("update", this._updatePaths, this);
        },
        onRemove: function() {
          this.off("update", this._updatePaths, this);
          this._destroyContainer();
        },
        getEvents: function() {
          var events = {
            viewreset: this._reset,
            zoom: this._onZoom,
            moveend: this._update,
            zoomend: this._onZoomEnd
          };
          if (this._zoomAnimated) {
            events.zoomanim = this._onAnimZoom;
          }
          return events;
        },
        _onAnimZoom: function(ev) {
          this._updateTransform(ev.center, ev.zoom);
        },
        _onZoom: function() {
          this._updateTransform(this._map.getCenter(), this._map.getZoom());
        },
        _updateTransform: function(center, zoom2) {
          var scale2 = this._map.getZoomScale(zoom2, this._zoom), viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding), currentCenterPoint = this._map.project(this._center, zoom2), topLeftOffset = viewHalf.multiplyBy(-scale2).add(currentCenterPoint).subtract(this._map._getNewPixelOrigin(center, zoom2));
          if (Browser.any3d) {
            setTransform(this._container, topLeftOffset, scale2);
          } else {
            setPosition(this._container, topLeftOffset);
          }
        },
        _reset: function() {
          this._update();
          this._updateTransform(this._center, this._zoom);
          for (var id in this._layers) {
            this._layers[id]._reset();
          }
        },
        _onZoomEnd: function() {
          for (var id in this._layers) {
            this._layers[id]._project();
          }
        },
        _updatePaths: function() {
          for (var id in this._layers) {
            this._layers[id]._update();
          }
        },
        _update: function() {
          var p2 = this.options.padding, size = this._map.getSize(), min = this._map.containerPointToLayerPoint(size.multiplyBy(-p2)).round();
          this._bounds = new Bounds(min, min.add(size.multiplyBy(1 + p2 * 2)).round());
          this._center = this._map.getCenter();
          this._zoom = this._map.getZoom();
        }
      });
      var Canvas = Renderer.extend({
        // @section
        // @aka Canvas options
        options: {
          // @option tolerance: Number = 0
          // How much to extend the click tolerance around a path/object on the map.
          tolerance: 0
        },
        getEvents: function() {
          var events = Renderer.prototype.getEvents.call(this);
          events.viewprereset = this._onViewPreReset;
          return events;
        },
        _onViewPreReset: function() {
          this._postponeUpdatePaths = true;
        },
        onAdd: function() {
          Renderer.prototype.onAdd.call(this);
          this._draw();
        },
        _initContainer: function() {
          var container = this._container = document.createElement("canvas");
          on(container, "mousemove", this._onMouseMove, this);
          on(container, "click dblclick mousedown mouseup contextmenu", this._onClick, this);
          on(container, "mouseout", this._handleMouseOut, this);
          container["_leaflet_disable_events"] = true;
          this._ctx = container.getContext("2d");
        },
        _destroyContainer: function() {
          cancelAnimFrame(this._redrawRequest);
          delete this._ctx;
          remove(this._container);
          off(this._container);
          delete this._container;
        },
        _updatePaths: function() {
          if (this._postponeUpdatePaths) {
            return;
          }
          var layer;
          this._redrawBounds = null;
          for (var id in this._layers) {
            layer = this._layers[id];
            layer._update();
          }
          this._redraw();
        },
        _update: function() {
          if (this._map._animatingZoom && this._bounds) {
            return;
          }
          Renderer.prototype._update.call(this);
          var b2 = this._bounds, container = this._container, size = b2.getSize(), m2 = Browser.retina ? 2 : 1;
          setPosition(container, b2.min);
          container.width = m2 * size.x;
          container.height = m2 * size.y;
          container.style.width = size.x + "px";
          container.style.height = size.y + "px";
          if (Browser.retina) {
            this._ctx.scale(2, 2);
          }
          this._ctx.translate(-b2.min.x, -b2.min.y);
          this.fire("update");
        },
        _reset: function() {
          Renderer.prototype._reset.call(this);
          if (this._postponeUpdatePaths) {
            this._postponeUpdatePaths = false;
            this._updatePaths();
          }
        },
        _initPath: function(layer) {
          this._updateDashArray(layer);
          this._layers[stamp(layer)] = layer;
          var order = layer._order = {
            layer,
            prev: this._drawLast,
            next: null
          };
          if (this._drawLast) {
            this._drawLast.next = order;
          }
          this._drawLast = order;
          this._drawFirst = this._drawFirst || this._drawLast;
        },
        _addPath: function(layer) {
          this._requestRedraw(layer);
        },
        _removePath: function(layer) {
          var order = layer._order;
          var next = order.next;
          var prev = order.prev;
          if (next) {
            next.prev = prev;
          } else {
            this._drawLast = prev;
          }
          if (prev) {
            prev.next = next;
          } else {
            this._drawFirst = next;
          }
          delete layer._order;
          delete this._layers[stamp(layer)];
          this._requestRedraw(layer);
        },
        _updatePath: function(layer) {
          this._extendRedrawBounds(layer);
          layer._project();
          layer._update();
          this._requestRedraw(layer);
        },
        _updateStyle: function(layer) {
          this._updateDashArray(layer);
          this._requestRedraw(layer);
        },
        _updateDashArray: function(layer) {
          if (typeof layer.options.dashArray === "string") {
            var parts = layer.options.dashArray.split(/[, ]+/), dashArray = [], dashValue, i2;
            for (i2 = 0; i2 < parts.length; i2++) {
              dashValue = Number(parts[i2]);
              if (isNaN(dashValue)) {
                return;
              }
              dashArray.push(dashValue);
            }
            layer.options._dashArray = dashArray;
          } else {
            layer.options._dashArray = layer.options.dashArray;
          }
        },
        _requestRedraw: function(layer) {
          if (!this._map) {
            return;
          }
          this._extendRedrawBounds(layer);
          this._redrawRequest = this._redrawRequest || requestAnimFrame(this._redraw, this);
        },
        _extendRedrawBounds: function(layer) {
          if (layer._pxBounds) {
            var padding = (layer.options.weight || 0) + 1;
            this._redrawBounds = this._redrawBounds || new Bounds();
            this._redrawBounds.extend(layer._pxBounds.min.subtract([padding, padding]));
            this._redrawBounds.extend(layer._pxBounds.max.add([padding, padding]));
          }
        },
        _redraw: function() {
          this._redrawRequest = null;
          if (this._redrawBounds) {
            this._redrawBounds.min._floor();
            this._redrawBounds.max._ceil();
          }
          this._clear();
          this._draw();
          this._redrawBounds = null;
        },
        _clear: function() {
          var bounds = this._redrawBounds;
          if (bounds) {
            var size = bounds.getSize();
            this._ctx.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
          } else {
            this._ctx.save();
            this._ctx.setTransform(1, 0, 0, 1, 0, 0);
            this._ctx.clearRect(0, 0, this._container.width, this._container.height);
            this._ctx.restore();
          }
        },
        _draw: function() {
          var layer, bounds = this._redrawBounds;
          this._ctx.save();
          if (bounds) {
            var size = bounds.getSize();
            this._ctx.beginPath();
            this._ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y);
            this._ctx.clip();
          }
          this._drawing = true;
          for (var order = this._drawFirst; order; order = order.next) {
            layer = order.layer;
            if (!bounds || layer._pxBounds && layer._pxBounds.intersects(bounds)) {
              layer._updatePath();
            }
          }
          this._drawing = false;
          this._ctx.restore();
        },
        _updatePoly: function(layer, closed) {
          if (!this._drawing) {
            return;
          }
          var i2, j2, len2, p2, parts = layer._parts, len = parts.length, ctx = this._ctx;
          if (!len) {
            return;
          }
          ctx.beginPath();
          for (i2 = 0; i2 < len; i2++) {
            for (j2 = 0, len2 = parts[i2].length; j2 < len2; j2++) {
              p2 = parts[i2][j2];
              ctx[j2 ? "lineTo" : "moveTo"](p2.x, p2.y);
            }
            if (closed) {
              ctx.closePath();
            }
          }
          this._fillStroke(ctx, layer);
        },
        _updateCircle: function(layer) {
          if (!this._drawing || layer._empty()) {
            return;
          }
          var p2 = layer._point, ctx = this._ctx, r2 = Math.max(Math.round(layer._radius), 1), s2 = (Math.max(Math.round(layer._radiusY), 1) || r2) / r2;
          if (s2 !== 1) {
            ctx.save();
            ctx.scale(1, s2);
          }
          ctx.beginPath();
          ctx.arc(p2.x, p2.y / s2, r2, 0, Math.PI * 2, false);
          if (s2 !== 1) {
            ctx.restore();
          }
          this._fillStroke(ctx, layer);
        },
        _fillStroke: function(ctx, layer) {
          var options = layer.options;
          if (options.fill) {
            ctx.globalAlpha = options.fillOpacity;
            ctx.fillStyle = options.fillColor || options.color;
            ctx.fill(options.fillRule || "evenodd");
          }
          if (options.stroke && options.weight !== 0) {
            if (ctx.setLineDash) {
              ctx.setLineDash(layer.options && layer.options._dashArray || []);
            }
            ctx.globalAlpha = options.opacity;
            ctx.lineWidth = options.weight;
            ctx.strokeStyle = options.color;
            ctx.lineCap = options.lineCap;
            ctx.lineJoin = options.lineJoin;
            ctx.stroke();
          }
        },
        // Canvas obviously doesn't have mouse events for individual drawn objects,
        // so we emulate that by calculating what's under the mouse on mousemove/click manually
        _onClick: function(e2) {
          var point = this._map.mouseEventToLayerPoint(e2), layer, clickedLayer;
          for (var order = this._drawFirst; order; order = order.next) {
            layer = order.layer;
            if (layer.options.interactive && layer._containsPoint(point)) {
              if (!(e2.type === "click" || e2.type === "preclick") || !this._map._draggableMoved(layer)) {
                clickedLayer = layer;
              }
            }
          }
          this._fireEvent(clickedLayer ? [clickedLayer] : false, e2);
        },
        _onMouseMove: function(e2) {
          if (!this._map || this._map.dragging.moving() || this._map._animatingZoom) {
            return;
          }
          var point = this._map.mouseEventToLayerPoint(e2);
          this._handleMouseHover(e2, point);
        },
        _handleMouseOut: function(e2) {
          var layer = this._hoveredLayer;
          if (layer) {
            removeClass(this._container, "leaflet-interactive");
            this._fireEvent([layer], e2, "mouseout");
            this._hoveredLayer = null;
            this._mouseHoverThrottled = false;
          }
        },
        _handleMouseHover: function(e2, point) {
          if (this._mouseHoverThrottled) {
            return;
          }
          var layer, candidateHoveredLayer;
          for (var order = this._drawFirst; order; order = order.next) {
            layer = order.layer;
            if (layer.options.interactive && layer._containsPoint(point)) {
              candidateHoveredLayer = layer;
            }
          }
          if (candidateHoveredLayer !== this._hoveredLayer) {
            this._handleMouseOut(e2);
            if (candidateHoveredLayer) {
              addClass(this._container, "leaflet-interactive");
              this._fireEvent([candidateHoveredLayer], e2, "mouseover");
              this._hoveredLayer = candidateHoveredLayer;
            }
          }
          this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : false, e2);
          this._mouseHoverThrottled = true;
          setTimeout(bind(function() {
            this._mouseHoverThrottled = false;
          }, this), 32);
        },
        _fireEvent: function(layers2, e2, type) {
          this._map._fireDOMEvent(e2, type || e2.type, layers2);
        },
        _bringToFront: function(layer) {
          var order = layer._order;
          if (!order) {
            return;
          }
          var next = order.next;
          var prev = order.prev;
          if (next) {
            next.prev = prev;
          } else {
            return;
          }
          if (prev) {
            prev.next = next;
          } else if (next) {
            this._drawFirst = next;
          }
          order.prev = this._drawLast;
          this._drawLast.next = order;
          order.next = null;
          this._drawLast = order;
          this._requestRedraw(layer);
        },
        _bringToBack: function(layer) {
          var order = layer._order;
          if (!order) {
            return;
          }
          var next = order.next;
          var prev = order.prev;
          if (prev) {
            prev.next = next;
          } else {
            return;
          }
          if (next) {
            next.prev = prev;
          } else if (prev) {
            this._drawLast = prev;
          }
          order.prev = null;
          order.next = this._drawFirst;
          this._drawFirst.prev = order;
          this._drawFirst = order;
          this._requestRedraw(layer);
        }
      });
      function canvas(options) {
        return Browser.canvas ? new Canvas(options) : null;
      }
      var vmlCreate = function() {
        try {
          document.namespaces.add("lvml", "urn:schemas-microsoft-com:vml");
          return function(name) {
            return document.createElement("<lvml:" + name + ' class="lvml">');
          };
        } catch (e2) {
        }
        return function(name) {
          return document.createElement("<" + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
        };
      }();
      var vmlMixin = {
        _initContainer: function() {
          this._container = create$1("div", "leaflet-vml-container");
        },
        _update: function() {
          if (this._map._animatingZoom) {
            return;
          }
          Renderer.prototype._update.call(this);
          this.fire("update");
        },
        _initPath: function(layer) {
          var container = layer._container = vmlCreate("shape");
          addClass(container, "leaflet-vml-shape " + (this.options.className || ""));
          container.coordsize = "1 1";
          layer._path = vmlCreate("path");
          container.appendChild(layer._path);
          this._updateStyle(layer);
          this._layers[stamp(layer)] = layer;
        },
        _addPath: function(layer) {
          var container = layer._container;
          this._container.appendChild(container);
          if (layer.options.interactive) {
            layer.addInteractiveTarget(container);
          }
        },
        _removePath: function(layer) {
          var container = layer._container;
          remove(container);
          layer.removeInteractiveTarget(container);
          delete this._layers[stamp(layer)];
        },
        _updateStyle: function(layer) {
          var stroke = layer._stroke, fill = layer._fill, options = layer.options, container = layer._container;
          container.stroked = !!options.stroke;
          container.filled = !!options.fill;
          if (options.stroke) {
            if (!stroke) {
              stroke = layer._stroke = vmlCreate("stroke");
            }
            container.appendChild(stroke);
            stroke.weight = options.weight + "px";
            stroke.color = options.color;
            stroke.opacity = options.opacity;
            if (options.dashArray) {
              stroke.dashStyle = isArray(options.dashArray) ? options.dashArray.join(" ") : options.dashArray.replace(/( *, *)/g, " ");
            } else {
              stroke.dashStyle = "";
            }
            stroke.endcap = options.lineCap.replace("butt", "flat");
            stroke.joinstyle = options.lineJoin;
          } else if (stroke) {
            container.removeChild(stroke);
            layer._stroke = null;
          }
          if (options.fill) {
            if (!fill) {
              fill = layer._fill = vmlCreate("fill");
            }
            container.appendChild(fill);
            fill.color = options.fillColor || options.color;
            fill.opacity = options.fillOpacity;
          } else if (fill) {
            container.removeChild(fill);
            layer._fill = null;
          }
        },
        _updateCircle: function(layer) {
          var p2 = layer._point.round(), r2 = Math.round(layer._radius), r22 = Math.round(layer._radiusY || r2);
          this._setPath(layer, layer._empty() ? "M0 0" : "AL " + p2.x + "," + p2.y + " " + r2 + "," + r22 + " 0," + 65535 * 360);
        },
        _setPath: function(layer, path) {
          layer._path.v = path;
        },
        _bringToFront: function(layer) {
          toFront(layer._container);
        },
        _bringToBack: function(layer) {
          toBack(layer._container);
        }
      };
      var create = Browser.vml ? vmlCreate : svgCreate;
      var SVG = Renderer.extend({
        _initContainer: function() {
          this._container = create("svg");
          this._container.setAttribute("pointer-events", "none");
          this._rootGroup = create("g");
          this._container.appendChild(this._rootGroup);
        },
        _destroyContainer: function() {
          remove(this._container);
          off(this._container);
          delete this._container;
          delete this._rootGroup;
          delete this._svgSize;
        },
        _update: function() {
          if (this._map._animatingZoom && this._bounds) {
            return;
          }
          Renderer.prototype._update.call(this);
          var b2 = this._bounds, size = b2.getSize(), container = this._container;
          if (!this._svgSize || !this._svgSize.equals(size)) {
            this._svgSize = size;
            container.setAttribute("width", size.x);
            container.setAttribute("height", size.y);
          }
          setPosition(container, b2.min);
          container.setAttribute("viewBox", [b2.min.x, b2.min.y, size.x, size.y].join(" "));
          this.fire("update");
        },
        // methods below are called by vector layers implementations
        _initPath: function(layer) {
          var path = layer._path = create("path");
          if (layer.options.className) {
            addClass(path, layer.options.className);
          }
          if (layer.options.interactive) {
            addClass(path, "leaflet-interactive");
          }
          this._updateStyle(layer);
          this._layers[stamp(layer)] = layer;
        },
        _addPath: function(layer) {
          if (!this._rootGroup) {
            this._initContainer();
          }
          this._rootGroup.appendChild(layer._path);
          layer.addInteractiveTarget(layer._path);
        },
        _removePath: function(layer) {
          remove(layer._path);
          layer.removeInteractiveTarget(layer._path);
          delete this._layers[stamp(layer)];
        },
        _updatePath: function(layer) {
          layer._project();
          layer._update();
        },
        _updateStyle: function(layer) {
          var path = layer._path, options = layer.options;
          if (!path) {
            return;
          }
          if (options.stroke) {
            path.setAttribute("stroke", options.color);
            path.setAttribute("stroke-opacity", options.opacity);
            path.setAttribute("stroke-width", options.weight);
            path.setAttribute("stroke-linecap", options.lineCap);
            path.setAttribute("stroke-linejoin", options.lineJoin);
            if (options.dashArray) {
              path.setAttribute("stroke-dasharray", options.dashArray);
            } else {
              path.removeAttribute("stroke-dasharray");
            }
            if (options.dashOffset) {
              path.setAttribute("stroke-dashoffset", options.dashOffset);
            } else {
              path.removeAttribute("stroke-dashoffset");
            }
          } else {
            path.setAttribute("stroke", "none");
          }
          if (options.fill) {
            path.setAttribute("fill", options.fillColor || options.color);
            path.setAttribute("fill-opacity", options.fillOpacity);
            path.setAttribute("fill-rule", options.fillRule || "evenodd");
          } else {
            path.setAttribute("fill", "none");
          }
        },
        _updatePoly: function(layer, closed) {
          this._setPath(layer, pointsToPath(layer._parts, closed));
        },
        _updateCircle: function(layer) {
          var p2 = layer._point, r2 = Math.max(Math.round(layer._radius), 1), r22 = Math.max(Math.round(layer._radiusY), 1) || r2, arc = "a" + r2 + "," + r22 + " 0 1,0 ";
          var d2 = layer._empty() ? "M0 0" : "M" + (p2.x - r2) + "," + p2.y + arc + r2 * 2 + ",0 " + arc + -r2 * 2 + ",0 ";
          this._setPath(layer, d2);
        },
        _setPath: function(layer, path) {
          layer._path.setAttribute("d", path);
        },
        // SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
        _bringToFront: function(layer) {
          toFront(layer._path);
        },
        _bringToBack: function(layer) {
          toBack(layer._path);
        }
      });
      if (Browser.vml) {
        SVG.include(vmlMixin);
      }
      function svg(options) {
        return Browser.svg || Browser.vml ? new SVG(options) : null;
      }
      Map2.include({
        // @namespace Map; @method getRenderer(layer: Path): Renderer
        // Returns the instance of `Renderer` that should be used to render the given
        // `Path`. It will ensure that the `renderer` options of the map and paths
        // are respected, and that the renderers do exist on the map.
        getRenderer: function(layer) {
          var renderer = layer.options.renderer || this._getPaneRenderer(layer.options.pane) || this.options.renderer || this._renderer;
          if (!renderer) {
            renderer = this._renderer = this._createRenderer();
          }
          if (!this.hasLayer(renderer)) {
            this.addLayer(renderer);
          }
          return renderer;
        },
        _getPaneRenderer: function(name) {
          if (name === "overlayPane" || name === void 0) {
            return false;
          }
          var renderer = this._paneRenderers[name];
          if (renderer === void 0) {
            renderer = this._createRenderer({ pane: name });
            this._paneRenderers[name] = renderer;
          }
          return renderer;
        },
        _createRenderer: function(options) {
          return this.options.preferCanvas && canvas(options) || svg(options);
        }
      });
      var Rectangle = Polygon.extend({
        initialize: function(latLngBounds, options) {
          Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
        },
        // @method setBounds(latLngBounds: LatLngBounds): this
        // Redraws the rectangle with the passed bounds.
        setBounds: function(latLngBounds) {
          return this.setLatLngs(this._boundsToLatLngs(latLngBounds));
        },
        _boundsToLatLngs: function(latLngBounds) {
          latLngBounds = toLatLngBounds(latLngBounds);
          return [
            latLngBounds.getSouthWest(),
            latLngBounds.getNorthWest(),
            latLngBounds.getNorthEast(),
            latLngBounds.getSouthEast()
          ];
        }
      });
      function rectangle(latLngBounds, options) {
        return new Rectangle(latLngBounds, options);
      }
      SVG.create = create;
      SVG.pointsToPath = pointsToPath;
      GeoJSON.geometryToLayer = geometryToLayer;
      GeoJSON.coordsToLatLng = coordsToLatLng;
      GeoJSON.coordsToLatLngs = coordsToLatLngs;
      GeoJSON.latLngToCoords = latLngToCoords;
      GeoJSON.latLngsToCoords = latLngsToCoords;
      GeoJSON.getFeature = getFeature;
      GeoJSON.asFeature = asFeature;
      Map2.mergeOptions({
        // @option boxZoom: Boolean = true
        // Whether the map can be zoomed to a rectangular area specified by
        // dragging the mouse while pressing the shift key.
        boxZoom: true
      });
      var BoxZoom = Handler.extend({
        initialize: function(map2) {
          this._map = map2;
          this._container = map2._container;
          this._pane = map2._panes.overlayPane;
          this._resetStateTimeout = 0;
          map2.on("unload", this._destroy, this);
        },
        addHooks: function() {
          on(this._container, "mousedown", this._onMouseDown, this);
        },
        removeHooks: function() {
          off(this._container, "mousedown", this._onMouseDown, this);
        },
        moved: function() {
          return this._moved;
        },
        _destroy: function() {
          remove(this._pane);
          delete this._pane;
        },
        _resetState: function() {
          this._resetStateTimeout = 0;
          this._moved = false;
        },
        _clearDeferredResetState: function() {
          if (this._resetStateTimeout !== 0) {
            clearTimeout(this._resetStateTimeout);
            this._resetStateTimeout = 0;
          }
        },
        _onMouseDown: function(e2) {
          if (!e2.shiftKey || e2.which !== 1 && e2.button !== 1) {
            return false;
          }
          this._clearDeferredResetState();
          this._resetState();
          disableTextSelection();
          disableImageDrag();
          this._startPoint = this._map.mouseEventToContainerPoint(e2);
          on(document, {
            contextmenu: stop,
            mousemove: this._onMouseMove,
            mouseup: this._onMouseUp,
            keydown: this._onKeyDown
          }, this);
        },
        _onMouseMove: function(e2) {
          if (!this._moved) {
            this._moved = true;
            this._box = create$1("div", "leaflet-zoom-box", this._container);
            addClass(this._container, "leaflet-crosshair");
            this._map.fire("boxzoomstart");
          }
          this._point = this._map.mouseEventToContainerPoint(e2);
          var bounds = new Bounds(this._point, this._startPoint), size = bounds.getSize();
          setPosition(this._box, bounds.min);
          this._box.style.width = size.x + "px";
          this._box.style.height = size.y + "px";
        },
        _finish: function() {
          if (this._moved) {
            remove(this._box);
            removeClass(this._container, "leaflet-crosshair");
          }
          enableTextSelection();
          enableImageDrag();
          off(document, {
            contextmenu: stop,
            mousemove: this._onMouseMove,
            mouseup: this._onMouseUp,
            keydown: this._onKeyDown
          }, this);
        },
        _onMouseUp: function(e2) {
          if (e2.which !== 1 && e2.button !== 1) {
            return;
          }
          this._finish();
          if (!this._moved) {
            return;
          }
          this._clearDeferredResetState();
          this._resetStateTimeout = setTimeout(bind(this._resetState, this), 0);
          var bounds = new LatLngBounds(
            this._map.containerPointToLatLng(this._startPoint),
            this._map.containerPointToLatLng(this._point)
          );
          this._map.fitBounds(bounds).fire("boxzoomend", { boxZoomBounds: bounds });
        },
        _onKeyDown: function(e2) {
          if (e2.keyCode === 27) {
            this._finish();
            this._clearDeferredResetState();
            this._resetState();
          }
        }
      });
      Map2.addInitHook("addHandler", "boxZoom", BoxZoom);
      Map2.mergeOptions({
        // @option doubleClickZoom: Boolean|String = true
        // Whether the map can be zoomed in by double clicking on it and
        // zoomed out by double clicking while holding shift. If passed
        // `'center'`, double-click zoom will zoom to the center of the
        //  view regardless of where the mouse was.
        doubleClickZoom: true
      });
      var DoubleClickZoom = Handler.extend({
        addHooks: function() {
          this._map.on("dblclick", this._onDoubleClick, this);
        },
        removeHooks: function() {
          this._map.off("dblclick", this._onDoubleClick, this);
        },
        _onDoubleClick: function(e2) {
          var map2 = this._map, oldZoom = map2.getZoom(), delta = map2.options.zoomDelta, zoom2 = e2.originalEvent.shiftKey ? oldZoom - delta : oldZoom + delta;
          if (map2.options.doubleClickZoom === "center") {
            map2.setZoom(zoom2);
          } else {
            map2.setZoomAround(e2.containerPoint, zoom2);
          }
        }
      });
      Map2.addInitHook("addHandler", "doubleClickZoom", DoubleClickZoom);
      Map2.mergeOptions({
        // @option dragging: Boolean = true
        // Whether the map is draggable with mouse/touch or not.
        dragging: true,
        // @section Panning Inertia Options
        // @option inertia: Boolean = *
        // If enabled, panning of the map will have an inertia effect where
        // the map builds momentum while dragging and continues moving in
        // the same direction for some time. Feels especially nice on touch
        // devices. Enabled by default.
        inertia: true,
        // @option inertiaDeceleration: Number = 3000
        // The rate with which the inertial movement slows down, in pixels/second².
        inertiaDeceleration: 3400,
        // px/s^2
        // @option inertiaMaxSpeed: Number = Infinity
        // Max speed of the inertial movement, in pixels/second.
        inertiaMaxSpeed: Infinity,
        // px/s
        // @option easeLinearity: Number = 0.2
        easeLinearity: 0.2,
        // TODO refactor, move to CRS
        // @option worldCopyJump: Boolean = false
        // With this option enabled, the map tracks when you pan to another "copy"
        // of the world and seamlessly jumps to the original one so that all overlays
        // like markers and vector layers are still visible.
        worldCopyJump: false,
        // @option maxBoundsViscosity: Number = 0.0
        // If `maxBounds` is set, this option will control how solid the bounds
        // are when dragging the map around. The default value of `0.0` allows the
        // user to drag outside the bounds at normal speed, higher values will
        // slow down map dragging outside bounds, and `1.0` makes the bounds fully
        // solid, preventing the user from dragging outside the bounds.
        maxBoundsViscosity: 0
      });
      var Drag = Handler.extend({
        addHooks: function() {
          if (!this._draggable) {
            var map2 = this._map;
            this._draggable = new Draggable(map2._mapPane, map2._container);
            this._draggable.on({
              dragstart: this._onDragStart,
              drag: this._onDrag,
              dragend: this._onDragEnd
            }, this);
            this._draggable.on("predrag", this._onPreDragLimit, this);
            if (map2.options.worldCopyJump) {
              this._draggable.on("predrag", this._onPreDragWrap, this);
              map2.on("zoomend", this._onZoomEnd, this);
              map2.whenReady(this._onZoomEnd, this);
            }
          }
          addClass(this._map._container, "leaflet-grab leaflet-touch-drag");
          this._draggable.enable();
          this._positions = [];
          this._times = [];
        },
        removeHooks: function() {
          removeClass(this._map._container, "leaflet-grab");
          removeClass(this._map._container, "leaflet-touch-drag");
          this._draggable.disable();
        },
        moved: function() {
          return this._draggable && this._draggable._moved;
        },
        moving: function() {
          return this._draggable && this._draggable._moving;
        },
        _onDragStart: function() {
          var map2 = this._map;
          map2._stop();
          if (this._map.options.maxBounds && this._map.options.maxBoundsViscosity) {
            var bounds = toLatLngBounds(this._map.options.maxBounds);
            this._offsetLimit = toBounds(
              this._map.latLngToContainerPoint(bounds.getNorthWest()).multiplyBy(-1),
              this._map.latLngToContainerPoint(bounds.getSouthEast()).multiplyBy(-1).add(this._map.getSize())
            );
            this._viscosity = Math.min(1, Math.max(0, this._map.options.maxBoundsViscosity));
          } else {
            this._offsetLimit = null;
          }
          map2.fire("movestart").fire("dragstart");
          if (map2.options.inertia) {
            this._positions = [];
            this._times = [];
          }
        },
        _onDrag: function(e2) {
          if (this._map.options.inertia) {
            var time = this._lastTime = +/* @__PURE__ */ new Date(), pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;
            this._positions.push(pos);
            this._times.push(time);
            this._prunePositions(time);
          }
          this._map.fire("move", e2).fire("drag", e2);
        },
        _prunePositions: function(time) {
          while (this._positions.length > 1 && time - this._times[0] > 50) {
            this._positions.shift();
            this._times.shift();
          }
        },
        _onZoomEnd: function() {
          var pxCenter = this._map.getSize().divideBy(2), pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);
          this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
          this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
        },
        _viscousLimit: function(value, threshold) {
          return value - (value - threshold) * this._viscosity;
        },
        _onPreDragLimit: function() {
          if (!this._viscosity || !this._offsetLimit) {
            return;
          }
          var offset = this._draggable._newPos.subtract(this._draggable._startPos);
          var limit = this._offsetLimit;
          if (offset.x < limit.min.x) {
            offset.x = this._viscousLimit(offset.x, limit.min.x);
          }
          if (offset.y < limit.min.y) {
            offset.y = this._viscousLimit(offset.y, limit.min.y);
          }
          if (offset.x > limit.max.x) {
            offset.x = this._viscousLimit(offset.x, limit.max.x);
          }
          if (offset.y > limit.max.y) {
            offset.y = this._viscousLimit(offset.y, limit.max.y);
          }
          this._draggable._newPos = this._draggable._startPos.add(offset);
        },
        _onPreDragWrap: function() {
          var worldWidth = this._worldWidth, halfWidth = Math.round(worldWidth / 2), dx = this._initialWorldOffset, x2 = this._draggable._newPos.x, newX1 = (x2 - halfWidth + dx) % worldWidth + halfWidth - dx, newX2 = (x2 + halfWidth + dx) % worldWidth - halfWidth - dx, newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;
          this._draggable._absPos = this._draggable._newPos.clone();
          this._draggable._newPos.x = newX;
        },
        _onDragEnd: function(e2) {
          var map2 = this._map, options = map2.options, noInertia = !options.inertia || e2.noInertia || this._times.length < 2;
          map2.fire("dragend", e2);
          if (noInertia) {
            map2.fire("moveend");
          } else {
            this._prunePositions(+/* @__PURE__ */ new Date());
            var direction = this._lastPos.subtract(this._positions[0]), duration = (this._lastTime - this._times[0]) / 1e3, ease = options.easeLinearity, speedVector = direction.multiplyBy(ease / duration), speed = speedVector.distanceTo([0, 0]), limitedSpeed = Math.min(options.inertiaMaxSpeed, speed), limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed), decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease), offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();
            if (!offset.x && !offset.y) {
              map2.fire("moveend");
            } else {
              offset = map2._limitOffset(offset, map2.options.maxBounds);
              requestAnimFrame(function() {
                map2.panBy(offset, {
                  duration: decelerationDuration,
                  easeLinearity: ease,
                  noMoveStart: true,
                  animate: true
                });
              });
            }
          }
        }
      });
      Map2.addInitHook("addHandler", "dragging", Drag);
      Map2.mergeOptions({
        // @option keyboard: Boolean = true
        // Makes the map focusable and allows users to navigate the map with keyboard
        // arrows and `+`/`-` keys.
        keyboard: true,
        // @option keyboardPanDelta: Number = 80
        // Amount of pixels to pan when pressing an arrow key.
        keyboardPanDelta: 80
      });
      var Keyboard = Handler.extend({
        keyCodes: {
          left: [37],
          right: [39],
          down: [40],
          up: [38],
          zoomIn: [187, 107, 61, 171],
          zoomOut: [189, 109, 54, 173]
        },
        initialize: function(map2) {
          this._map = map2;
          this._setPanDelta(map2.options.keyboardPanDelta);
          this._setZoomDelta(map2.options.zoomDelta);
        },
        addHooks: function() {
          var container = this._map._container;
          if (container.tabIndex <= 0) {
            container.tabIndex = "0";
          }
          on(container, {
            focus: this._onFocus,
            blur: this._onBlur,
            mousedown: this._onMouseDown
          }, this);
          this._map.on({
            focus: this._addHooks,
            blur: this._removeHooks
          }, this);
        },
        removeHooks: function() {
          this._removeHooks();
          off(this._map._container, {
            focus: this._onFocus,
            blur: this._onBlur,
            mousedown: this._onMouseDown
          }, this);
          this._map.off({
            focus: this._addHooks,
            blur: this._removeHooks
          }, this);
        },
        _onMouseDown: function() {
          if (this._focused) {
            return;
          }
          var body = document.body, docEl = document.documentElement, top = body.scrollTop || docEl.scrollTop, left = body.scrollLeft || docEl.scrollLeft;
          this._map._container.focus();
          window.scrollTo(left, top);
        },
        _onFocus: function() {
          this._focused = true;
          this._map.fire("focus");
        },
        _onBlur: function() {
          this._focused = false;
          this._map.fire("blur");
        },
        _setPanDelta: function(panDelta) {
          var keys = this._panKeys = {}, codes = this.keyCodes, i2, len;
          for (i2 = 0, len = codes.left.length; i2 < len; i2++) {
            keys[codes.left[i2]] = [-1 * panDelta, 0];
          }
          for (i2 = 0, len = codes.right.length; i2 < len; i2++) {
            keys[codes.right[i2]] = [panDelta, 0];
          }
          for (i2 = 0, len = codes.down.length; i2 < len; i2++) {
            keys[codes.down[i2]] = [0, panDelta];
          }
          for (i2 = 0, len = codes.up.length; i2 < len; i2++) {
            keys[codes.up[i2]] = [0, -1 * panDelta];
          }
        },
        _setZoomDelta: function(zoomDelta) {
          var keys = this._zoomKeys = {}, codes = this.keyCodes, i2, len;
          for (i2 = 0, len = codes.zoomIn.length; i2 < len; i2++) {
            keys[codes.zoomIn[i2]] = zoomDelta;
          }
          for (i2 = 0, len = codes.zoomOut.length; i2 < len; i2++) {
            keys[codes.zoomOut[i2]] = -zoomDelta;
          }
        },
        _addHooks: function() {
          on(document, "keydown", this._onKeyDown, this);
        },
        _removeHooks: function() {
          off(document, "keydown", this._onKeyDown, this);
        },
        _onKeyDown: function(e2) {
          if (e2.altKey || e2.ctrlKey || e2.metaKey) {
            return;
          }
          var key = e2.keyCode, map2 = this._map, offset;
          if (key in this._panKeys) {
            if (!map2._panAnim || !map2._panAnim._inProgress) {
              offset = this._panKeys[key];
              if (e2.shiftKey) {
                offset = toPoint(offset).multiplyBy(3);
              }
              if (map2.options.maxBounds) {
                offset = map2._limitOffset(toPoint(offset), map2.options.maxBounds);
              }
              if (map2.options.worldCopyJump) {
                var newLatLng = map2.wrapLatLng(map2.unproject(map2.project(map2.getCenter()).add(offset)));
                map2.panTo(newLatLng);
              } else {
                map2.panBy(offset);
              }
            }
          } else if (key in this._zoomKeys) {
            map2.setZoom(map2.getZoom() + (e2.shiftKey ? 3 : 1) * this._zoomKeys[key]);
          } else if (key === 27 && map2._popup && map2._popup.options.closeOnEscapeKey) {
            map2.closePopup();
          } else {
            return;
          }
          stop(e2);
        }
      });
      Map2.addInitHook("addHandler", "keyboard", Keyboard);
      Map2.mergeOptions({
        // @section Mouse wheel options
        // @option scrollWheelZoom: Boolean|String = true
        // Whether the map can be zoomed by using the mouse wheel. If passed `'center'`,
        // it will zoom to the center of the view regardless of where the mouse was.
        scrollWheelZoom: true,
        // @option wheelDebounceTime: Number = 40
        // Limits the rate at which a wheel can fire (in milliseconds). By default
        // user can't zoom via wheel more often than once per 40 ms.
        wheelDebounceTime: 40,
        // @option wheelPxPerZoomLevel: Number = 60
        // How many scroll pixels (as reported by [L.DomEvent.getWheelDelta](#domevent-getwheeldelta))
        // mean a change of one full zoom level. Smaller values will make wheel-zooming
        // faster (and vice versa).
        wheelPxPerZoomLevel: 60
      });
      var ScrollWheelZoom = Handler.extend({
        addHooks: function() {
          on(this._map._container, "wheel", this._onWheelScroll, this);
          this._delta = 0;
        },
        removeHooks: function() {
          off(this._map._container, "wheel", this._onWheelScroll, this);
        },
        _onWheelScroll: function(e2) {
          var delta = getWheelDelta(e2);
          var debounce = this._map.options.wheelDebounceTime;
          this._delta += delta;
          this._lastMousePos = this._map.mouseEventToContainerPoint(e2);
          if (!this._startTime) {
            this._startTime = +/* @__PURE__ */ new Date();
          }
          var left = Math.max(debounce - (+/* @__PURE__ */ new Date() - this._startTime), 0);
          clearTimeout(this._timer);
          this._timer = setTimeout(bind(this._performZoom, this), left);
          stop(e2);
        },
        _performZoom: function() {
          var map2 = this._map, zoom2 = map2.getZoom(), snap = this._map.options.zoomSnap || 0;
          map2._stop();
          var d2 = this._delta / (this._map.options.wheelPxPerZoomLevel * 4), d3 = 4 * Math.log(2 / (1 + Math.exp(-Math.abs(d2)))) / Math.LN2, d4 = snap ? Math.ceil(d3 / snap) * snap : d3, delta = map2._limitZoom(zoom2 + (this._delta > 0 ? d4 : -d4)) - zoom2;
          this._delta = 0;
          this._startTime = null;
          if (!delta) {
            return;
          }
          if (map2.options.scrollWheelZoom === "center") {
            map2.setZoom(zoom2 + delta);
          } else {
            map2.setZoomAround(this._lastMousePos, zoom2 + delta);
          }
        }
      });
      Map2.addInitHook("addHandler", "scrollWheelZoom", ScrollWheelZoom);
      var tapHoldDelay = 600;
      Map2.mergeOptions({
        // @section Touch interaction options
        // @option tapHold: Boolean
        // Enables simulation of `contextmenu` event, default is `true` for mobile Safari.
        tapHold: Browser.touchNative && Browser.safari && Browser.mobile,
        // @option tapTolerance: Number = 15
        // The max number of pixels a user can shift his finger during touch
        // for it to be considered a valid tap.
        tapTolerance: 15
      });
      var TapHold = Handler.extend({
        addHooks: function() {
          on(this._map._container, "touchstart", this._onDown, this);
        },
        removeHooks: function() {
          off(this._map._container, "touchstart", this._onDown, this);
        },
        _onDown: function(e2) {
          clearTimeout(this._holdTimeout);
          if (e2.touches.length !== 1) {
            return;
          }
          var first = e2.touches[0];
          this._startPos = this._newPos = new Point(first.clientX, first.clientY);
          this._holdTimeout = setTimeout(bind(function() {
            this._cancel();
            if (!this._isTapValid()) {
              return;
            }
            on(document, "touchend", preventDefault);
            on(document, "touchend touchcancel", this._cancelClickPrevent);
            this._simulateEvent("contextmenu", first);
          }, this), tapHoldDelay);
          on(document, "touchend touchcancel contextmenu", this._cancel, this);
          on(document, "touchmove", this._onMove, this);
        },
        _cancelClickPrevent: function cancelClickPrevent() {
          off(document, "touchend", preventDefault);
          off(document, "touchend touchcancel", cancelClickPrevent);
        },
        _cancel: function() {
          clearTimeout(this._holdTimeout);
          off(document, "touchend touchcancel contextmenu", this._cancel, this);
          off(document, "touchmove", this._onMove, this);
        },
        _onMove: function(e2) {
          var first = e2.touches[0];
          this._newPos = new Point(first.clientX, first.clientY);
        },
        _isTapValid: function() {
          return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
        },
        _simulateEvent: function(type, e2) {
          var simulatedEvent = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            // detail: 1,
            screenX: e2.screenX,
            screenY: e2.screenY,
            clientX: e2.clientX,
            clientY: e2.clientY
            // button: 2,
            // buttons: 2
          });
          simulatedEvent._simulated = true;
          e2.target.dispatchEvent(simulatedEvent);
        }
      });
      Map2.addInitHook("addHandler", "tapHold", TapHold);
      Map2.mergeOptions({
        // @section Touch interaction options
        // @option touchZoom: Boolean|String = *
        // Whether the map can be zoomed by touch-dragging with two fingers. If
        // passed `'center'`, it will zoom to the center of the view regardless of
        // where the touch events (fingers) were. Enabled for touch-capable web
        // browsers.
        touchZoom: Browser.touch,
        // @option bounceAtZoomLimits: Boolean = true
        // Set it to false if you don't want the map to zoom beyond min/max zoom
        // and then bounce back when pinch-zooming.
        bounceAtZoomLimits: true
      });
      var TouchZoom = Handler.extend({
        addHooks: function() {
          addClass(this._map._container, "leaflet-touch-zoom");
          on(this._map._container, "touchstart", this._onTouchStart, this);
        },
        removeHooks: function() {
          removeClass(this._map._container, "leaflet-touch-zoom");
          off(this._map._container, "touchstart", this._onTouchStart, this);
        },
        _onTouchStart: function(e2) {
          var map2 = this._map;
          if (!e2.touches || e2.touches.length !== 2 || map2._animatingZoom || this._zooming) {
            return;
          }
          var p1 = map2.mouseEventToContainerPoint(e2.touches[0]), p2 = map2.mouseEventToContainerPoint(e2.touches[1]);
          this._centerPoint = map2.getSize()._divideBy(2);
          this._startLatLng = map2.containerPointToLatLng(this._centerPoint);
          if (map2.options.touchZoom !== "center") {
            this._pinchStartLatLng = map2.containerPointToLatLng(p1.add(p2)._divideBy(2));
          }
          this._startDist = p1.distanceTo(p2);
          this._startZoom = map2.getZoom();
          this._moved = false;
          this._zooming = true;
          map2._stop();
          on(document, "touchmove", this._onTouchMove, this);
          on(document, "touchend touchcancel", this._onTouchEnd, this);
          preventDefault(e2);
        },
        _onTouchMove: function(e2) {
          if (!e2.touches || e2.touches.length !== 2 || !this._zooming) {
            return;
          }
          var map2 = this._map, p1 = map2.mouseEventToContainerPoint(e2.touches[0]), p2 = map2.mouseEventToContainerPoint(e2.touches[1]), scale2 = p1.distanceTo(p2) / this._startDist;
          this._zoom = map2.getScaleZoom(scale2, this._startZoom);
          if (!map2.options.bounceAtZoomLimits && (this._zoom < map2.getMinZoom() && scale2 < 1 || this._zoom > map2.getMaxZoom() && scale2 > 1)) {
            this._zoom = map2._limitZoom(this._zoom);
          }
          if (map2.options.touchZoom === "center") {
            this._center = this._startLatLng;
            if (scale2 === 1) {
              return;
            }
          } else {
            var delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
            if (scale2 === 1 && delta.x === 0 && delta.y === 0) {
              return;
            }
            this._center = map2.unproject(map2.project(this._pinchStartLatLng, this._zoom).subtract(delta), this._zoom);
          }
          if (!this._moved) {
            map2._moveStart(true, false);
            this._moved = true;
          }
          cancelAnimFrame(this._animRequest);
          var moveFn = bind(map2._move, map2, this._center, this._zoom, { pinch: true, round: false }, void 0);
          this._animRequest = requestAnimFrame(moveFn, this, true);
          preventDefault(e2);
        },
        _onTouchEnd: function() {
          if (!this._moved || !this._zooming) {
            this._zooming = false;
            return;
          }
          this._zooming = false;
          cancelAnimFrame(this._animRequest);
          off(document, "touchmove", this._onTouchMove, this);
          off(document, "touchend touchcancel", this._onTouchEnd, this);
          if (this._map.options.zoomAnimation) {
            this._map._animateZoom(this._center, this._map._limitZoom(this._zoom), true, this._map.options.zoomSnap);
          } else {
            this._map._resetView(this._center, this._map._limitZoom(this._zoom));
          }
        }
      });
      Map2.addInitHook("addHandler", "touchZoom", TouchZoom);
      Map2.BoxZoom = BoxZoom;
      Map2.DoubleClickZoom = DoubleClickZoom;
      Map2.Drag = Drag;
      Map2.Keyboard = Keyboard;
      Map2.ScrollWheelZoom = ScrollWheelZoom;
      Map2.TapHold = TapHold;
      Map2.TouchZoom = TouchZoom;
      exports2.Bounds = Bounds;
      exports2.Browser = Browser;
      exports2.CRS = CRS;
      exports2.Canvas = Canvas;
      exports2.Circle = Circle;
      exports2.CircleMarker = CircleMarker;
      exports2.Class = Class;
      exports2.Control = Control;
      exports2.DivIcon = DivIcon;
      exports2.DivOverlay = DivOverlay;
      exports2.DomEvent = DomEvent;
      exports2.DomUtil = DomUtil;
      exports2.Draggable = Draggable;
      exports2.Evented = Evented;
      exports2.FeatureGroup = FeatureGroup;
      exports2.GeoJSON = GeoJSON;
      exports2.GridLayer = GridLayer;
      exports2.Handler = Handler;
      exports2.Icon = Icon2;
      exports2.ImageOverlay = ImageOverlay;
      exports2.LatLng = LatLng;
      exports2.LatLngBounds = LatLngBounds;
      exports2.Layer = Layer;
      exports2.LayerGroup = LayerGroup;
      exports2.LineUtil = LineUtil;
      exports2.Map = Map2;
      exports2.Marker = Marker;
      exports2.Mixin = Mixin;
      exports2.Path = Path;
      exports2.Point = Point;
      exports2.PolyUtil = PolyUtil;
      exports2.Polygon = Polygon;
      exports2.Polyline = Polyline;
      exports2.Popup = Popup;
      exports2.PosAnimation = PosAnimation;
      exports2.Projection = index;
      exports2.Rectangle = Rectangle;
      exports2.Renderer = Renderer;
      exports2.SVG = SVG;
      exports2.SVGOverlay = SVGOverlay;
      exports2.TileLayer = TileLayer;
      exports2.Tooltip = Tooltip;
      exports2.Transformation = Transformation;
      exports2.Util = Util;
      exports2.VideoOverlay = VideoOverlay;
      exports2.bind = bind;
      exports2.bounds = toBounds;
      exports2.canvas = canvas;
      exports2.circle = circle;
      exports2.circleMarker = circleMarker;
      exports2.control = control2;
      exports2.divIcon = divIcon2;
      exports2.extend = extend;
      exports2.featureGroup = featureGroup;
      exports2.geoJSON = geoJSON;
      exports2.geoJson = geoJson;
      exports2.gridLayer = gridLayer;
      exports2.icon = icon;
      exports2.imageOverlay = imageOverlay;
      exports2.latLng = toLatLng;
      exports2.latLngBounds = toLatLngBounds;
      exports2.layerGroup = layerGroup;
      exports2.map = createMap;
      exports2.marker = marker2;
      exports2.point = toPoint;
      exports2.polygon = polygon;
      exports2.polyline = polyline2;
      exports2.popup = popup;
      exports2.rectangle = rectangle;
      exports2.setOptions = setOptions;
      exports2.stamp = stamp;
      exports2.svg = svg;
      exports2.svgOverlay = svgOverlay;
      exports2.tileLayer = tileLayer2;
      exports2.tooltip = tooltip;
      exports2.transformation = toTransformation;
      exports2.version = version;
      exports2.videoOverlay = videoOverlay;
      var oldL = window.L;
      exports2.noConflict = function() {
        window.L = oldL;
        return this;
      };
      window.L = exports2;
    });
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => HikingJournalPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/trip-manager.ts
var import_obsidian = require("obsidian");
init_track_parser();

// src/markdown-generator.ts
function generateJournalMarkdown(config, sections, photos) {
  const lines = [];
  lines.push("---");
  lines.push("type: hiking-journal");
  lines.push(`name: "${escYaml(config.name)}"`);
  lines.push(`date: "${config.date}"`);
  lines.push(`region: "${escYaml(config.region)}"`);
  if (config.description)
    lines.push(`description: "${escYaml(config.description)}"`);
  if (config.gpxPath)
    lines.push(`gpx: "${config.gpxPath}"`);
  if (config.distanceKm)
    lines.push(`distance_km: ${config.distanceKm}`);
  if (config.elevationGainM)
    lines.push(`elevation_gain: ${config.elevationGainM}`);
  if (config.elevationLossM)
    lines.push(`elevation_loss: ${config.elevationLossM}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${config.name}`);
  lines.push("");
  if (config.description) {
    lines.push(`> ${config.description}`);
    lines.push("");
  }
  const rootSections = sections.filter((s2) => s2.level === 2);
  for (const section of rootSections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    appendPhotos(lines, section.photos, photos);
    const children = sections.filter((s2) => s2.parentId === section.id);
    for (const child of children) {
      lines.push(`${"#".repeat(child.level)} ${child.title}`);
      lines.push("");
      appendPhotos(lines, child.photos, photos);
      if (child.level === 3) {
        for (const gc of sections.filter((s2) => s2.parentId === child.id)) {
          lines.push(`#### ${gc.title}`);
          lines.push("");
          appendPhotos(lines, gc.photos, photos);
        }
      }
    }
  }
  const assigned = /* @__PURE__ */ new Set();
  for (const s2 of sections)
    for (const pid of s2.photos)
      assigned.add(pid);
  const unassigned = Array.from(photos.values()).filter((p2) => !assigned.has(p2.id));
  if (unassigned.length > 0) {
    lines.push("## Unsorted Photos");
    lines.push("");
    for (const photo of unassigned)
      appendSinglePhoto(lines, photo);
  }
  return lines.join("\n");
}
function generateJournalFromWaypoints(config, waypoints, stats) {
  const lines = [];
  lines.push("---");
  lines.push("type: hiking-journal");
  lines.push(`name: "${escYaml(config.name)}"`);
  lines.push(`date: "${config.date}"`);
  lines.push(`region: "${escYaml(config.region)}"`);
  if (config.description)
    lines.push(`description: "${escYaml(config.description)}"`);
  if (config.gpxPath)
    lines.push(`gpx: "${config.gpxPath}"`);
  if (stats) {
    lines.push(`distance_km: ${stats.distanceKm}`);
    lines.push(`elevation_gain: ${stats.elevationGainM}`);
    lines.push(`elevation_loss: ${stats.elevationLossM}`);
  }
  lines.push("---");
  lines.push("");
  lines.push(`# ${config.name}`);
  lines.push("");
  if (config.description) {
    lines.push(`> ${config.description}`);
    lines.push("");
  }
  const dateGroups = /* @__PURE__ */ new Map();
  for (const wp of waypoints) {
    const dateKey = wp.datetime ? wp.datetime.split("T")[0] : "unknown";
    if (!dateGroups.has(dateKey))
      dateGroups.set(dateKey, []);
    dateGroups.get(dateKey).push(wp);
  }
  const sortedDates = Array.from(dateGroups.keys()).sort();
  for (let i2 = 0; i2 < sortedDates.length; i2++) {
    const date = sortedDates[i2];
    const wps = dateGroups.get(date);
    if (date !== "unknown") {
      const d2 = /* @__PURE__ */ new Date(date + "T00:00:00");
      const dateStr = d2.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      lines.push(`## Day ${i2 + 1} \u2014 ${dateStr}`);
    } else {
      lines.push(`## Trip Photos`);
    }
    lines.push("");
    for (const wp of wps) {
      if (wp.imageUrl) {
        lines.push(`![${wp.title}](${wp.imageUrl})`);
      } else if (wp.filename) {
        lines.push(`![[${wp.filename}]]`);
      }
      const lat = wp.lat ? wp.lat.toFixed(6) : "";
      const lng = wp.lng ? wp.lng.toFixed(6) : "";
      const alt = wp.alt != null ? `${wp.alt}` : "";
      const time = wp.datetime || "";
      const src = wp.gpsSource || "manual";
      lines.push(`%%hj: lat=${lat}, lng=${lng}, alt=${alt}, time=${time}, src=${src}%%`);
      lines.push("");
      if (wp.blog && wp.blog.trim()) {
        lines.push(wp.blog);
      } else {
        lines.push("*Write your story here...*");
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}
function appendPhotos(lines, photoIds, photos) {
  for (const pid of photoIds) {
    const photo = photos.get(pid);
    if (photo)
      appendSinglePhoto(lines, photo);
  }
}
function appendSinglePhoto(lines, photo) {
  lines.push(`![[${photo.filename}]]`);
  const lat = photo.exif.lat != null ? photo.exif.lat.toFixed(6) : "";
  const lng = photo.exif.lng != null ? photo.exif.lng.toFixed(6) : "";
  const alt = photo.exif.alt != null ? `${photo.exif.alt}` : "";
  const time = photo.exif.datetime || "";
  const src = photo.exif.hasGps ? "exif" : "manual";
  lines.push(`%%hj: lat=${lat}, lng=${lng}, alt=${alt}, time=${time}, src=${src}%%`);
  lines.push("");
  lines.push("*Write your story here...*");
  lines.push("");
}
function escYaml(s2) {
  return s2.replace(/"/g, '\\"');
}
// === V4 Multi-route Markdown Generator ===
function generateJournalMarkdownV4(config, routes, locations) {
  const lines = [];
  lines.push("---");
  lines.push("type: hiking-journal");
  lines.push("version: 4");
  lines.push(`name: "${escYaml(config.name)}"`);
  lines.push(`date: "${config.date}"`);
  if (config.endDate) lines.push(`end_date: "${config.endDate}"`);
  lines.push(`region: "${escYaml(config.region)}"`);
  if (config.description)
    lines.push(`description: "${escYaml(config.description)}"`);
  if (config.mapStyle && config.mapStyle !== "opentopomap")
    lines.push(`map_style: "${config.mapStyle}"`);
  // Store routes as JSON string for easy parsing
  const routesMeta = routes.map((r) => ({
    id: r.id,
    name: r.name,
    date: r.date || "",
    gpx: r.gpxFileName || "",
    distance_km: r.stats?.distanceKm || 0,
    elevation_gain: r.stats?.elevationGainM || 0,
    elevation_loss: r.stats?.elevationLossM || 0,
    sortOrder: r.sortOrder || 0
  }));
  lines.push(`routes_json: '${JSON.stringify(routesMeta).replace(/'/g, "''")}'`);
  // Aggregate stats
  const totalDist = routes.reduce((s, r) => s + (r.stats?.distanceKm || 0), 0);
  const totalGain = routes.reduce((s, r) => s + (r.stats?.elevationGainM || 0), 0);
  const totalLoss = routes.reduce((s, r) => s + (r.stats?.elevationLossM || 0), 0);
  if (totalDist) lines.push(`distance_km: ${Math.round(totalDist * 10) / 10}`);
  if (totalGain) lines.push(`elevation_gain: ${totalGain}`);
  if (totalLoss) lines.push(`elevation_loss: ${totalLoss}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${config.name}`);
  lines.push("");
  if (config.description) {
    lines.push(`> ${config.description}`);
    lines.push("");
  }
  // Group locations by route, maintaining sort order
  const sortedRoutes = [...routes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  for (const route of sortedRoutes) {
    lines.push(`## ${route.name}`);
    lines.push("");
    const routeLocs = locations
      .filter((loc) => loc.routeId === route.id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    for (const loc of routeLocs) {
      lines.push(`### ${loc.title || "Untitled Location"}`);
      // Location metadata
      const lat = loc.lat ? loc.lat.toFixed(6) : "";
      const lng = loc.lng ? loc.lng.toFixed(6) : "";
      const alt = loc.alt != null ? `${loc.alt}` : "";
      const time = loc.datetime || "";
      const src = loc.gpsSource || "manual";
      lines.push(`%%hj: route=${route.id}, lat=${lat}, lng=${lng}, alt=${alt}, time=${time}, src=${src}%%`);
      lines.push("");
      // Photos for this location
      const sortedPhotos = [...(loc.photos || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      for (const photo of sortedPhotos) {
        if (photo.imageUrl) {
          lines.push(`![${photo.title || photo.filename}](${photo.imageUrl})`);
        } else {
          lines.push(`![[${photo.filename}]]`);
        }
        lines.push(`%%hj-photo: id=${photo.id}, sort=${photo.sortOrder || 0}%%`);
        lines.push("");
      }
      // Blog text
      if (loc.blog && loc.blog.trim()) {
        lines.push(loc.blog);
      } else {
        lines.push("*Write your story here...*");
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}
// === V5 Multi-route Markdown Generator (locations in frontmatter) ===
function generateJournalMarkdownV5(config, routes, locations, sections) {
  const lines = [];
  lines.push("---");
  lines.push("type: hiking-journal");
  lines.push("version: 5");
  lines.push(`name: "${escYaml(config.name)}"`);
  lines.push(`date: "${config.date}"`);
  if (config.endDate) lines.push(`end_date: "${config.endDate}"`);
  lines.push(`region: "${escYaml(config.region)}"`);
  if (config.description)
    lines.push(`description: "${escYaml(config.description)}"`);
  if (config.mapStyle && config.mapStyle !== "opentopomap")
    lines.push(`map_style: "${config.mapStyle}"`);
  // Routes JSON (same as V4)
  const routesMeta = routes.map((r) => ({
    id: r.id, name: r.name, date: r.date || "",
    gpx: r.gpxFileName || "",
    distance_km: r.stats?.distanceKm || 0,
    elevation_gain: r.stats?.elevationGainM || 0,
    elevation_loss: r.stats?.elevationLossM || 0,
    sortOrder: r.sortOrder || 0
  }));
  lines.push(`routes_json: '${JSON.stringify(routesMeta).replace(/'/g, "''")}'`);
  // NEW: Locations in frontmatter — GPS data safe from body edits
  const locsMeta = locations.map((loc) => ({
    id: loc.id,
    routeId: loc.routeId,
    title: loc.title || "Untitled Location",
    lat: loc.lat ? parseFloat(loc.lat.toFixed(6)) : null,
    lng: loc.lng ? parseFloat(loc.lng.toFixed(6)) : null,
    alt: loc.alt != null ? loc.alt : null,
    time: loc.datetime || "",
    src: loc.gpsSource || "manual",
    photos: (loc.photos || []).map((p) => ({
      id: p.id, filename: p.filename || "",
      imageUrl: p.imageUrl || "",
      title: p.title || "", sort: p.sortOrder || 0, ar: p.aspectRatio || ""
    })),
    sort: loc.sortOrder || 0
  }));
  lines.push(`locations_json: '${JSON.stringify(locsMeta).replace(/'/g, "''")}'`);
  // Aggregate stats
  const totalDist = routes.reduce((s, r) => s + (r.stats?.distanceKm || 0), 0);
  const totalGain = routes.reduce((s, r) => s + (r.stats?.elevationGainM || 0), 0);
  const totalLoss = routes.reduce((s, r) => s + (r.stats?.elevationLossM || 0), 0);
  if (totalDist) lines.push(`distance_km: ${Math.round(totalDist * 10) / 10}`);
  if (totalGain) lines.push(`elevation_gain: ${totalGain}`);
  if (totalLoss) lines.push(`elevation_loss: ${totalLoss}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${config.name}`);
  lines.push("");
  if (config.description) {
    lines.push(`> ${config.description}`);
    lines.push("");
  }
  // Body: route headings + section headings + photo embeds + blog text
  const sortedRoutes = [...routes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  // Helper: write photos for a location
  const writeLocPhotos = (loc) => {
    const sortedPhotos = [...(loc.photos || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    for (const photo of sortedPhotos) {
      if (photo.imageUrl) {
        lines.push(`![${photo.title || photo.filename}](${photo.imageUrl})`);
      } else if (photo.filename) {
        lines.push(`![[${photo.filename}]]`);
      }
      lines.push("");
    }
  };
  for (const route of sortedRoutes) {
    lines.push(`## ${route.name}`);
    lines.push("");
    if (sections && sections.length > 0) {
      // Section-based body (from wizard Step 4)
      const routeSections = sections.filter((s) => s.routeId === route.id);
      for (const sec of routeSections) {
        lines.push(`### ${sec.title}`);
        lines.push("");
        // Photos from assigned locations
        for (const locId of sec.locationIds) {
          const loc = locations.find((l) => l.id === locId);
          if (loc) writeLocPhotos(loc);
        }
        // Section blog text
        if (sec.text && sec.text.trim()) {
          lines.push(sec.text);
        } else {
          lines.push("*Write your story here...*");
        }
        lines.push("");
      }
      // Any unassigned locations for this route — append with auto-title
      const assignedIds = new Set();
      for (const sec of routeSections) {
        for (const lid of sec.locationIds) assignedIds.add(lid);
      }
      const unassigned = locations.filter((l) => l.routeId === route.id && !assignedIds.has(l.id));
      for (const loc of unassigned) {
        lines.push(`### ${loc.title || "Untitled Location"}`);
        lines.push("");
        writeLocPhotos(loc);
        lines.push("*Write your story here...*");
        lines.push("");
      }
    } else {
      // Fallback: one section per location (for appendRoute or no sections)
      const routeLocs = locations
        .filter((loc) => loc.routeId === route.id)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      for (const loc of routeLocs) {
        lines.push(`### ${loc.title || "Untitled Location"}`);
        lines.push("");
        writeLocPhotos(loc);
        if (loc.blog && loc.blog.trim()) {
          lines.push(loc.blog);
        } else {
          lines.push("*Write your story here...*");
        }
        lines.push("");
      }
    }
  }
  return lines.join("\n");
}
// === V4 Markdown Parser ===
function parseJournalV4(fm, body) {
  // Parse routes from JSON
  let routes = [];
  if (fm["routes_json"]) {
    try {
      routes = JSON.parse(fm["routes_json"]);
    } catch (e) {
      console.warn("[HJ] Failed to parse routes_json:", e);
    }
  }
  const config = {
    name: fm["name"] || "Untitled",
    date: fm["date"] || "",
    endDate: fm["end_date"] || "",
    region: fm["region"] || "",
    description: fm["description"] || "",
    mapStyle: fm["map_style"] || "opentopomap",
    routes: routes,
    distanceKm: fm["distance_km"] ? parseFloat(fm["distance_km"]) : void 0,
    elevationGainM: fm["elevation_gain"] ? parseFloat(fm["elevation_gain"]) : void 0,
    elevationLossM: fm["elevation_loss"] ? parseFloat(fm["elevation_loss"]) : void 0
  };
  const locations = [];
  let currentRouteTitle = "";
  let currentRouteId = "";
  let currentLocTitle = "";
  let locCounter = 0;
  const lines = body.split("\n").map((l) => l.replace(/\r$/, ""));
  let currentLoc = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // H2 = route/day header
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match && !line.startsWith("###")) {
      currentRouteTitle = h2Match[1].trim();
      // Try to match route by name
      const matchedRoute = routes.find((r) => r.name === currentRouteTitle);
      currentRouteId = matchedRoute ? matchedRoute.id : `route-auto-${currentRouteTitle}`;
      continue;
    }
    // H3 = location header
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      // Save previous location if exists
      if (currentLoc) {
        locations.push(currentLoc);
      }
      currentLocTitle = h3Match[1].trim();
      locCounter++;
      currentLoc = {
        id: `loc-${locCounter}`,
        routeId: currentRouteId,
        title: currentLocTitle,
        lat: void 0,
        lng: void 0,
        alt: void 0,
        datetime: void 0,
        gpsSource: "manual",
        photos: [],
        blog: "",
        sortOrder: locCounter
      };
      continue;
    }
    // Location metadata: %%hj: route=X, lat=Y, ...%%
    const hjMatch = line.match(/^%%hj:\s*(.+)%%$/);
    if (hjMatch && currentLoc) {
      const meta = hjMatch[1];
      const routeMatch = meta.match(/route=([^,]*)/);
      const latMatch = meta.match(/lat=([^,]*)/);
      const lngMatch = meta.match(/lng=([^,]*)/);
      const altMatch = meta.match(/alt=([^,]*)/);
      const timeMatch = meta.match(/time=([^,]*)/);
      const srcMatch = meta.match(/src=(\w+)/);
      if (routeMatch && routeMatch[1].trim()) currentLoc.routeId = routeMatch[1].trim();
      if (latMatch && latMatch[1].trim()) currentLoc.lat = parseFloat(latMatch[1]);
      if (lngMatch && lngMatch[1].trim()) currentLoc.lng = parseFloat(lngMatch[1]);
      if (altMatch && altMatch[1].trim()) currentLoc.alt = parseFloat(altMatch[1]);
      if (timeMatch && timeMatch[1].trim()) currentLoc.datetime = timeMatch[1].trim();
      if (srcMatch) currentLoc.gpsSource = srcMatch[1];
      continue;
    }
    // Photo metadata: %%hj-photo: id=X, sort=Y%%
    const photoMetaMatch = line.match(/^%%hj-photo:\s*(.+)%%$/);
    if (photoMetaMatch && currentLoc) {
      // This metadata line follows an image line; update last photo
      const pmeta = photoMetaMatch[1];
      const idMatch = pmeta.match(/id=([^,]*)/);
      const sortMatch = pmeta.match(/sort=(\d+)/);
      const lastPhoto = currentLoc.photos[currentLoc.photos.length - 1];
      if (lastPhoto) {
        if (idMatch) lastPhoto.id = idMatch[1].trim();
        if (sortMatch) lastPhoto.sortOrder = parseInt(sortMatch[1]);
      }
      continue;
    }
    // Image embeds
    const localImgMatch = line.match(/^!\[\[([^\]]+)\]\]$/);
    const extImgMatch = !localImgMatch ? line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/) : null;
    if ((localImgMatch || extImgMatch) && currentLoc) {
      const photo = {
        id: `photo-${currentLoc.photos.length + 1}`,
        filename: localImgMatch ? localImgMatch[1] : "",
        vaultPath: "",
        title: extImgMatch ? extImgMatch[1] : (localImgMatch ? localImgMatch[1] : ""),
        imageUrl: extImgMatch ? extImgMatch[2] : void 0,
        sortOrder: currentLoc.photos.length
      };
      currentLoc.photos.push(photo);
      continue;
    }
    // Blog text (anything else inside a location block)
    if (currentLoc && line.trim() && line.trim() !== "*Write your story here...*") {
      if (currentLoc.blog) {
        currentLoc.blog += "\n" + line;
      } else {
        currentLoc.blog = line;
      }
    }
  }
  // Push last location
  if (currentLoc) {
    locations.push(currentLoc);
  }
  // Clean up lat/lng NaN
  for (const loc of locations) {
    if (loc.lat != null && isNaN(loc.lat)) loc.lat = void 0;
    if (loc.lng != null && isNaN(loc.lng)) loc.lng = void 0;
    if (loc.alt != null && isNaN(loc.alt)) loc.alt = void 0;
  }
  return { config, locations, version: 4 };
}
// === V5 Parser (locations from frontmatter) ===
function parseJournalV5(fm, body) {
  // Routes from frontmatter (same as V4)
  let routes = [];
  if (fm["routes_json"]) {
    try { routes = JSON.parse(fm["routes_json"]); } catch (e) {
      console.warn("[HJ] Failed to parse routes_json:", e);
    }
  }
  // Locations from frontmatter (NEW in V5 — GPS data safe from body edits)
  let locsMeta = [];
  if (fm["locations_json"]) {
    try { locsMeta = JSON.parse(fm["locations_json"]); } catch (e) {
      console.warn("[HJ] Failed to parse locations_json:", e);
    }
  }
  const config = {
    name: fm["name"] || "Untitled",
    date: fm["date"] || "",
    endDate: fm["end_date"] || "",
    region: fm["region"] || "",
    description: fm["description"] || "",
    mapStyle: fm["map_style"] || "opentopomap",
    routes: routes,
    distanceKm: fm["distance_km"] ? parseFloat(fm["distance_km"]) : void 0,
    elevationGainM: fm["elevation_gain"] ? parseFloat(fm["elevation_gain"]) : void 0,
    elevationLossM: fm["elevation_loss"] ? parseFloat(fm["elevation_loss"]) : void 0
  };
  // Build location objects from frontmatter
  const locations = locsMeta.map((lm, i) => {
    const lat = lm.lat != null ? parseFloat(lm.lat) : void 0;
    const lng = lm.lng != null ? parseFloat(lm.lng) : void 0;
    const alt = lm.alt != null ? parseFloat(lm.alt) : void 0;
    return {
      id: lm.id || `loc-${i + 1}`,
      routeId: lm.routeId || "",
      title: lm.title || `Location ${i + 1}`,
      lat: (lat != null && !isNaN(lat)) ? lat : void 0,
      lng: (lng != null && !isNaN(lng)) ? lng : void 0,
      alt: (alt != null && !isNaN(alt)) ? alt : void 0,
      datetime: lm.time || void 0,
      gpsSource: lm.src || "manual",
      photos: (lm.photos || []).map((p) => ({
        id: p.id || "",
        filename: p.filename || "",
        title: p.title || "",
        imageUrl: p.imageUrl || void 0,
        sortOrder: p.sort || 0,
        ar: p.ar || ""
      })),
      blog: "",
      sortOrder: lm.sort || i
    };
  });
  // Extract blog text from body by matching photos to locations
  _extractBlogTextV5(body, locations);
  return { config, locations, version: 5 };
}
function _extractBlogTextV5(body, locations) {
  // Build lookup: photo filename/url → location index
  const photoToLocIdx = new Map();
  for (let li = 0; li < locations.length; li++) {
    for (const p of locations[li].photos) {
      if (p.filename) photoToLocIdx.set(p.filename, li);
      if (p.imageUrl) photoToLocIdx.set(p.imageUrl, li);
    }
  }
  const lines = body.split("\n").map((l) => l.replace(/\r$/, ""));
  let currentLocIdx = -1;
  let currentSectionTitle = "";
  let blogLines = [];
  const flushBlog = () => {
    if (currentLocIdx >= 0 && currentLocIdx < locations.length) {
      const text = blogLines.join("\n").trim();
      if (text && text !== "*Write your story here...*") {
        if (locations[currentLocIdx].blog) {
          locations[currentLocIdx].blog += "\n" + text;
        } else {
          locations[currentLocIdx].blog = text;
        }
      }
    }
    blogLines = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip H1 title and blockquote description
    if (line.match(/^#\s+/) && !line.startsWith("##")) continue;
    if (line.match(/^>\s+/) && currentLocIdx < 0) continue;
    // H2 route header — skip (routes come from frontmatter)
    if (line.match(/^##\s+/) && !line.startsWith("###")) continue;
    // H3 heading — track as section title for locations that follow
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      flushBlog();
      currentSectionTitle = h3Match[1].trim();
      const matchIdx = locations.findIndex((l) => l.title === currentSectionTitle);
      if (matchIdx >= 0) currentLocIdx = matchIdx;
      continue;
    }
    // Photo embed — identify which location it belongs to
    const localImgMatch = line.match(/^!\[\[([^\]]+)\]\]$/);
    const extImgMatch = !localImgMatch ? line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/) : null;
    if (localImgMatch || extImgMatch) {
      const fn = localImgMatch ? localImgMatch[1] : (extImgMatch ? extImgMatch[2] : "");
      const locIdx = photoToLocIdx.get(fn);
      if (locIdx !== void 0 && locIdx !== currentLocIdx) {
        flushBlog();
        currentLocIdx = locIdx;
      }
      // Assign section title to this location
      if (locIdx !== void 0 && currentSectionTitle) {
        locations[locIdx].sectionTitle = locations[locIdx].sectionTitle || currentSectionTitle;
      }
      continue;
    }
    // Skip empty lines unless we're collecting blog text
    if (!line.trim()) {
      if (blogLines.length > 0) blogLines.push(line);
      continue;
    }
    // Anything else = blog text for current location
    blogLines.push(line);
  }
  flushBlog();
}
function parseJournalMarkdown(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!fmMatch)
    return null;
  const fm = parseSimpleYaml(fmMatch[1]);
  if (fm["type"] !== "hiking-journal")
    return null;
  // Detect version and dispatch
  const version = parseInt(fm["version"] || "3");
  if (version >= 5) {
    return parseJournalV5(fm, fmMatch[2]);
  }
  if (version >= 4) {
    return parseJournalV4(fm, fmMatch[2]);
  }
  // V3 legacy parsing
  const config = {
    name: fm["name"] || "Untitled",
    date: fm["date"] || "",
    region: fm["region"] || "",
    description: fm["description"] || "",
    gpxPath: fm["gpx"] || void 0,
    distanceKm: fm["distance_km"] ? parseFloat(fm["distance_km"]) : void 0,
    elevationGainM: fm["elevation_gain"] ? parseFloat(fm["elevation_gain"]) : void 0,
    elevationLossM: fm["elevation_loss"] ? parseFloat(fm["elevation_loss"]) : void 0
  };
  const body = fmMatch[2];
  const entries = [];
  let currentSection = "";
  let currentLevel = 2;
  const lines = body.split("\n").map((l2) => l2.replace(/\r$/, ""));
  for (let i2 = 0; i2 < lines.length; i2++) {
    const line = lines[i2];
    const headerMatch = line.match(/^(#{2,4})\s+(.+)$/);
    if (headerMatch) {
      currentSection = headerMatch[2].trim();
      currentLevel = headerMatch[1].length;
      continue;
    }
    const localImgMatch = line.match(/^!\[\[([^\]]+)\]\]$/);
    const extImgMatch = !localImgMatch ? line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/) : null;
    if (localImgMatch || extImgMatch) {
      const imagePath = localImgMatch ? localImgMatch[1] : void 0;
      const imageUrl = extImgMatch ? extImgMatch[2] : void 0;
      const imageAlt = extImgMatch ? extImgMatch[1] : void 0;
      let lat, lng, alt;
      let datetime, gpsSource = "manual";
      if (i2 + 1 < lines.length) {
        const metaMatch = lines[i2 + 1].match(
          /^%%hj:\s*lat=([^,]*),\s*lng=([^,]*),\s*alt=([^,]*),\s*time=([^,]*),\s*src=(\w+)%%$/
        );
        if (metaMatch) {
          lat = metaMatch[1] ? parseFloat(metaMatch[1]) : void 0;
          lng = metaMatch[2] ? parseFloat(metaMatch[2]) : void 0;
          alt = metaMatch[3] ? parseFloat(metaMatch[3]) : void 0;
          datetime = metaMatch[4] || void 0;
          gpsSource = metaMatch[5] || "manual";
          i2++;
        }
      }
      const textLines = [];
      while (i2 + 1 < lines.length) {
        const next = lines[i2 + 1];
        if (next.match(/^#{2,4}\s/) || next.match(/^!\[\[/) || next.match(/^!\[/))
          break;
        if (next.trim() && next.trim() !== "*Write your story here...*") {
          textLines.push(next);
        }
        i2++;
      }
      entries.push({
        sectionTitle: currentSection,
        sectionLevel: currentLevel,
        imagePath,
        imageUrl,
        imageAlt,
        lat: lat != null && !isNaN(lat) ? lat : void 0,
        lng: lng != null && !isNaN(lng) ? lng : void 0,
        alt: alt != null && !isNaN(alt) ? alt : void 0,
        datetime,
        gpsSource,
        text: textLines.join("\n").trim()
      });
    }
  }
  return { config, entries, version: 3 };
}
function parseSimpleYaml(yaml) {
  const result = {};
  for (const line of yaml.split("\n").map((l2) => l2.replace(/\r$/, ""))) {
    const m2 = line.match(/^(\w[\w.-]*)\s*:\s*(.*)$/);
    if (m2) {
      let v2 = m2[2].trim();
      if (v2.startsWith('"') && v2.endsWith('"') || v2.startsWith("'") && v2.endsWith("'")) {
        v2 = v2.slice(1, -1);
      }
      result[m2[1]] = v2;
    }
  }
  return result;
}

// src/trip-manager.ts
var ROOT = "hiking-journal";
var TripManager = class {
  constructor(app) {
    this.index = { version: 1, trips: [] };
    this.loadedTrip = null;
    this.tripFolder = "";
    this.app = app;
  }
  // === Index ===
  async loadIndex() {
    try {
      const path = (0, import_obsidian.normalizePath)(`${ROOT}/index.json`);
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof import_obsidian.TFile) {
        this.index = JSON.parse(await this.app.vault.read(file));
      }
    } catch {
      console.log("[HJ] No index yet (first run)");
    }
    return this.index;
  }
  getIndex() {
    return this.index;
  }
  async saveIndex() {
    await this.ensureFolder(ROOT);
    const path = (0, import_obsidian.normalizePath)(`${ROOT}/index.json`);
    const content = JSON.stringify(this.index, null, 2);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian.TFile)
      await this.app.vault.modify(file, content);
    else
      await this.app.vault.create(path, content);
  }
  // === Register (called by wizard after .md creation) ===
  async registerJournal(slug, config, waypointCount, distanceKm, centerLat, centerLng, routeCount) {
    this.index.trips = this.index.trips.filter((t2) => t2.id !== slug);
    this.index.trips.push({
      id: slug,
      name: config.name,
      region: config.region,
      date: config.date,
      description: config.description,
      waypointCount,
      routeCount: routeCount || 1,
      distanceKm,
      centerLat,
      centerLng,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    await this.saveIndex();
  }
  // === Load Trip (.md format) ===
  async loadTrip(id) {
    const folder = `${ROOT}/${id}`;
    this.tripFolder = folder;
    const journalMd = await this.findJournalMd(folder);
    if (journalMd) {
      console.log("[HJ] Loading .md:", journalMd.path);
      const content = await this.app.vault.read(journalMd);
      const parsed = parseJournalMarkdown(content);
      if (parsed)
        return await this.buildTripFromParsed(id, folder, parsed);
      console.warn("[HJ] Failed to parse journal .md");
    }
    new import_obsidian.Notice(`No journal found in ${folder}`);
    return null;
  }
  // === Delete Trip ===
  async deleteTrip(id) {
    const folder = (0, import_obsidian.normalizePath)(`${ROOT}/${id}`);
    const files = this.app.vault.getFiles().filter((f2) => f2.path.startsWith(folder));
    for (const f2 of files)
      await this.app.vault.delete(f2);
    try {
      const dir = this.app.vault.getAbstractFileByPath(folder);
      if (dir)
        await this.app.vault.delete(dir, true);
    } catch {
    }
    this.index.trips = this.index.trips.filter((t2) => t2.id !== id);
    await this.saveIndex();
    if (this.loadedTrip?.id === id)
      this.loadedTrip = null;
  }
  // === Getters ===
  getLoadedTrip() {
    return this.loadedTrip;
  }
  hasLoadedTrip() {
    return this.loadedTrip !== null && this.loadedTrip.waypoints.length > 0;
  }
  getTripFolder() {
    return this.tripFolder;
  }
  // === Internal: find journal .md in folder ===
  async findJournalMd(folder) {
    const dir = this.app.vault.getAbstractFileByPath((0, import_obsidian.normalizePath)(folder));
    if (!dir)
      return null;
    const allFiles = this.app.vault.getFiles().filter(
      (f2) => f2.path.startsWith((0, import_obsidian.normalizePath)(folder) + "/") && f2.extension === "md"
    );
    for (const f2 of allFiles) {
      try {
        const content = await this.app.vault.read(f2);
        if (content.includes("type: hiking-journal"))
          return f2;
      } catch {
      }
    }
    return null;
  }
  // === Internal: load a single track file and return parsed data ===
  async loadTrackFile(folder, gpxFileName) {
    try {
      const trackPath = (0, import_obsidian.normalizePath)(`${folder}/${gpxFileName}`);
      const trackFile = this.app.vault.getAbstractFileByPath(trackPath);
      if (trackFile instanceof import_obsidian.TFile) {
        const ext = trackFile.extension.toLowerCase();
        let result;
        if (ext === "fit" || ext === "kmz") {
          const { parseTrackBinary: parseTrackBinary2 } = await Promise.resolve().then(() => (init_track_parser(), track_parser_exports));
          const buf = await this.app.vault.readBinary(trackFile);
          result = await parseTrackBinary2(buf, trackFile.name);
        } else {
          const content = await this.app.vault.read(trackFile);
          result = parseTrackText(content, trackFile.name);
        }
        const gpxTrackFull = result.trackPoints.map((p2) => ({ lat: p2.lat, lng: p2.lng, ele: p2.ele }));
        const simplified = result.trackPoints.length > 1e3 ? simplifyTrack(result.trackPoints, 1e-4) : result.trackPoints;
        const gpxTrack = simplified.map((p2) => ({ lat: p2.lat, lng: p2.lng, ele: p2.ele }));
        console.log(`[HJ] Track loaded: ${gpxFileName} (${result.trackPoints.length} pts)`);
        return { gpxTrack, gpxTrackFull, trackPoints: result.trackPoints, stats: {
          distanceKm: result.totalDistanceKm || 0,
          elevationGainM: result.elevationGainM || 0,
          elevationLossM: result.elevationLossM || 0
        }};
      }
    } catch (err) {
      console.warn(`[HJ] Failed to load track file ${gpxFileName}:`, err);
    }
    return null;
  }
  // === Internal: parse .md → TripData ===
  async buildTripFromParsed(id, folder, parsed) {
    if (!parsed)
      throw new Error("Failed to parse journal");
    const pad = 0.02;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    // === V4 Multi-route format ===
    if (parsed.version >= 4) {
      const routes = [];
      const allTrackPoints = [];
      // Load each route's GPX file
      for (const routeMeta of (parsed.config.routes || [])) {
        const routeData = {
          id: routeMeta.id,
          name: routeMeta.name,
          date: routeMeta.date || "",
          gpxFileName: routeMeta.gpx || "",
          gpxTrack: [],
          gpxTrackFull: [],
          stats: {
            distanceKm: routeMeta.distance_km || 0,
            elevationGainM: routeMeta.elevation_gain || 0,
            elevationLossM: routeMeta.elevation_loss || 0
          },
          sortOrder: routeMeta.sortOrder || routes.length
        };
        if (routeMeta.gpx) {
          const trackData = await this.loadTrackFile(folder, routeMeta.gpx);
          if (trackData) {
            routeData.gpxTrack = trackData.gpxTrack;
            routeData.gpxTrackFull = trackData.gpxTrackFull;
            allTrackPoints.push(...trackData.trackPoints);
            // Update stats from actual GPX if available
            if (trackData.stats.distanceKm) routeData.stats = trackData.stats;
          }
        }
        routes.push(routeData);
      }
      // Build locations from parsed data
      const locations = (parsed.locations || []).map((loc, i2) => ({
        id: loc.id || `loc-${i2}`,
        routeId: loc.routeId || "",
        lat: loc.lat || 0,
        lng: loc.lng || 0,
        alt: loc.alt,
        title: loc.title || `Location ${i2 + 1}`,
        description: loc.description || "",
        blog: loc.blog || "",
        photos: (loc.photos || []).map((p) => {
          let vp = "";
          if (p.filename) {
            const inPhotos = (0, import_obsidian.normalizePath)(`${folder}/photos/${p.filename}`);
            const inRoot = (0, import_obsidian.normalizePath)(`${folder}/${p.filename}`);
            vp = this.app.vault.getAbstractFileByPath(inPhotos) ? inPhotos : inRoot;
          }
          return {
            id: p.id,
            filename: p.filename || "",
            vaultPath: vp,
            title: p.title || p.filename || "",
            imageUrl: p.imageUrl || void 0,
            sortOrder: p.sortOrder || 0
          };
        }),
        gpsSource: loc.gpsSource || "manual",
        datetime: loc.datetime,
        sortOrder: loc.sortOrder || i2,
        sectionTitle: loc.sectionTitle || ""
      }));
      // Compute bounds from all locations + all track points
      const allLats = [];
      const allLngs = [];
      for (const loc of locations) {
        if (loc.lat && loc.lng) { allLats.push(loc.lat); allLngs.push(loc.lng); }
      }
      for (const tp of allTrackPoints) {
        allLats.push(tp.lat); allLngs.push(tp.lng);
      }
      const bounds = allLats.length > 0 ? {
        north: Math.max(...allLats) + pad,
        south: Math.min(...allLats) - pad,
        east: Math.max(...allLngs) + pad,
        west: Math.min(...allLngs) - pad
      } : { north: 90, south: -90, east: 180, west: -180 };
      // Aggregate stats
      const totalDist = routes.reduce((s, r) => s + (r.stats?.distanceKm || 0), 0);
      const totalGain = routes.reduce((s, r) => s + (r.stats?.elevationGainM || 0), 0);
      const totalLoss = routes.reduce((s, r) => s + (r.stats?.elevationLossM || 0), 0);
      // Build combined gpxTrack for backward compat with TripView
      // Concatenate all route tracks in order; record break indices for disconnected routes
      let gpxTrack = [];
      let gpxTrackFull = [];
      const gpxBreaks = []; // indices in combined gpxTrack where a new disconnected segment starts
      const sortedRoutes = [...routes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      for (const r of sortedRoutes) {
        if (gpxTrack.length > 0 && r.gpxTrack.length > 0) {
          const lastPt = gpxTrack[gpxTrack.length - 1];
          const firstPt = r.gpxTrack[0];
          const dlat = Math.abs(lastPt.lat - firstPt.lat);
          const dlng = Math.abs(lastPt.lng - firstPt.lng);
          if (Math.sqrt(dlat * dlat + dlng * dlng) > 0.001) { // ~111 m gap threshold
            gpxBreaks.push(gpxTrack.length);
          }
        }
        gpxTrack = gpxTrack.concat(r.gpxTrack);
        gpxTrackFull = gpxTrackFull.concat(r.gpxTrackFull);
      }
      // Fallback: if no GPX tracks, use location points
      if (gpxTrack.length === 0) {
        const withGps = locations.filter((l) => l.lat && l.lng);
        gpxTrack = withGps.map((l) => ({ lat: l.lat, lng: l.lng, ele: l.alt }));
        gpxTrackFull = gpxTrack;
      }
      // Build waypoints for backward compat with TripView
      const waypoints = [];
      for (const loc of locations) {
        // Use first photo as the waypoint's image, or empty
        const firstPhoto = loc.photos[0];
        waypoints.push({
          id: loc.id,
          filename: firstPhoto?.filename || "",
          vaultPath: firstPhoto?.vaultPath || "",
          imageUrl: firstPhoto?.imageUrl || void 0,
          lat: loc.lat || 0,
          lng: loc.lng || 0,
          alt: loc.alt,
          datetime: loc.datetime,
          title: loc.title,
          description: loc.description,
          blog: loc.blog,
          gpsSource: loc.gpsSource,
          // V4 extended: all photos for this location
          photos: loc.photos,
          routeId: loc.routeId,
          sectionTitle: loc.sectionTitle || ""
        });
      }
      this.loadedTrip = {
        version: parsed.version || 4,
        id,
        name: parsed.config.name,
        description: parsed.config.description,
        region: parsed.config.region,
        date: parsed.config.date,
        endDate: parsed.config.endDate || "",
        mapStyle: parsed.config.mapStyle || "opentopomap",
        routes: sortedRoutes,
        locations,
        gpxTrack,
        gpxTrackFull,
        gpxBreaks,
        waypoints,
        bounds,
        stats: {
          distanceKm: totalDist || parsed.config.distanceKm || 0,
          elevationGainM: totalGain || parsed.config.elevationGainM || 0,
          elevationLossM: totalLoss || parsed.config.elevationLossM || 0
        },
        createdAt: now,
        updatedAt: now
      };
      return this.loadedTrip;
    }
    // === V3 Legacy format ===
    const waypoints = parsed.entries.map((entry, i2) => ({
      id: `entry-${i2}`,
      filename: entry.imagePath || "",
      vaultPath: (() => {
        if (!entry.imagePath) return "";
        const inPhotos = (0, import_obsidian.normalizePath)(`${folder}/photos/${entry.imagePath}`);
        const inRoot = (0, import_obsidian.normalizePath)(`${folder}/${entry.imagePath}`);
        return this.app.vault.getAbstractFileByPath(inPhotos) ? inPhotos : inRoot;
      })(),
      imageUrl: entry.imageUrl || void 0,
      lat: entry.lat || 0,
      lng: entry.lng || 0,
      alt: entry.alt,
      datetime: entry.datetime,
      title: entry.imageAlt || entry.sectionTitle || `Photo ${i2 + 1}`,
      description: "",
      blog: entry.text,
      gpsSource: entry.gpsSource
    }));
    const withGps = waypoints.filter((w2) => w2.lat && w2.lng);
    const lats = withGps.map((w2) => w2.lat);
    const lngs = withGps.map((w2) => w2.lng);
    const bounds = lats.length > 0 ? {
      north: Math.max(...lats) + pad,
      south: Math.min(...lats) - pad,
      east: Math.max(...lngs) + pad,
      west: Math.min(...lngs) - pad
    } : { north: 90, south: -90, east: 180, west: -180 };
    let gpxTrack = [];
    let gpxTrackFull = [];
    if (parsed.config.gpxPath) {
      const trackData = await this.loadTrackFile(folder, parsed.config.gpxPath);
      if (trackData) {
        gpxTrackFull = trackData.gpxTrackFull;
        gpxTrack = trackData.gpxTrack;
        for (const p2 of trackData.trackPoints) {
          if (p2.lat < bounds.south) bounds.south = p2.lat - pad;
          if (p2.lat > bounds.north) bounds.north = p2.lat + pad;
          if (p2.lng < bounds.west) bounds.west = p2.lng - pad;
          if (p2.lng > bounds.east) bounds.east = p2.lng + pad;
        }
      }
    }
    if (gpxTrack.length === 0) {
      gpxTrack = withGps.map((w2) => ({ lat: w2.lat, lng: w2.lng, ele: w2.alt }));
      gpxTrackFull = gpxTrack;
    }
    this.loadedTrip = {
      version: 3,
      id,
      name: parsed.config.name,
      description: parsed.config.description,
      region: parsed.config.region,
      date: parsed.config.date,
      gpxTrack,
      gpxTrackFull,
      waypoints,
      bounds,
      stats: {
        distanceKm: parsed.config.distanceKm || 0,
        elevationGainM: parsed.config.elevationGainM || 0,
        elevationLossM: parsed.config.elevationLossM || 0
      },
      mapStyle: parsed.config.mapStyle || "opentopomap",
      createdAt: now,
      updatedAt: now
    };
    return this.loadedTrip;
  }
  // === Helpers ===
  async ensureFolder(path) {
    const parts = path.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      const normalized = (0, import_obsidian.normalizePath)(current);
      if (!this.app.vault.getAbstractFileByPath(normalized)) {
        try {
          await this.app.vault.createFolder(normalized);
        } catch {
        }
      }
    }
  }
  toSummary(trip) {
    const withGps = trip.waypoints.filter((w2) => w2.lat && w2.lng);
    let centerLat, centerLng;
    if (withGps.length) {
      centerLat = withGps.reduce((s2, w2) => s2 + w2.lat, 0) / withGps.length;
      centerLng = withGps.reduce((s2, w2) => s2 + w2.lng, 0) / withGps.length;
    } else if (trip.gpxTrack.length) {
      centerLat = trip.gpxTrack.reduce((s2, p2) => s2 + p2.lat, 0) / trip.gpxTrack.length;
      centerLng = trip.gpxTrack.reduce((s2, p2) => s2 + p2.lng, 0) / trip.gpxTrack.length;
    }
    return {
      id: trip.id,
      name: trip.name,
      region: trip.region,
      date: trip.date,
      description: trip.description,
      waypointCount: trip.waypoints.length,
      routeCount: trip.routes ? trip.routes.length : 1,
      distanceKm: trip.stats.distanceKm,
      centerLat,
      centerLng,
      updatedAt: trip.updatedAt
    };
  }
  // === Append new routes to existing journal (V4) ===
  async appendRouteToJournal(tripId, newRoutes, newLocations, photoBuffers) {
    const folder = `${ROOT}/${tripId}`;
    const journalMd = await this.findJournalMd(folder);
    if (!journalMd) {
      throw new Error("Journal not found for trip: " + tripId);
    }
    const content = await this.app.vault.read(journalMd);
    const parsed = parseJournalMarkdown(content);
    if (!parsed) {
      throw new Error("Failed to parse journal markdown");
    }
    // Merge: combine existing data with new data
    let existingRoutes = [];
    let existingLocations = [];
    if (parsed.version >= 4) {
      existingRoutes = parsed.config.routes || [];
      existingLocations = parsed.locations || [];
    } else {
      // Migrate v3 to v4 in memory
      if (parsed.config.gpxPath) {
        existingRoutes.push({
          id: "route-1",
          name: "Main Route",
          gpx: parsed.config.gpxPath,
          distance_km: parsed.config.distanceKm || 0,
          elevation_gain: parsed.config.elevationGainM || 0,
          elevation_loss: parsed.config.elevationLossM || 0,
          sortOrder: 0
        });
      }
      // Convert entries to locations
      if (parsed.entries) {
        existingLocations = parsed.entries.map((entry, i) => ({
          id: `loc-${i + 1}`,
          routeId: "route-1",
          title: entry.sectionTitle || `Location ${i + 1}`,
          lat: entry.lat,
          lng: entry.lng,
          alt: entry.alt,
          datetime: entry.datetime,
          gpsSource: entry.gpsSource,
          photos: entry.imagePath ? [{
            id: `photo-${i + 1}`,
            filename: entry.imagePath,
            vaultPath: "",
            title: entry.imageAlt || entry.imagePath,
            sortOrder: 0
          }] : [],
          blog: entry.text,
          sortOrder: i
        }));
      }
    }
    // Assign sortOrder to new routes continuing from existing
    const maxRouteOrder = existingRoutes.reduce((m, r) => Math.max(m, r.sortOrder || 0), -1);
    for (let i = 0; i < newRoutes.length; i++) {
      newRoutes[i].sortOrder = maxRouteOrder + 1 + i;
    }
    const maxLocOrder = existingLocations.reduce((m, l) => Math.max(m, l.sortOrder || 0), -1);
    for (let i = 0; i < newLocations.length; i++) {
      newLocations[i].sortOrder = maxLocOrder + 1 + i;
    }
    // Copy new photo files into photos/ subfolder
    if (photoBuffers) {
      const photoFolder = `${folder}/photos`;
      await this.ensureFolder(photoFolder);
      for (const [photoId, buffer] of photoBuffers) {
        for (const loc of newLocations) {
          const photo = (loc.photos || []).find((p) => p.id === photoId);
          if (photo && photo.filename) {
            const destPath = (0, import_obsidian.normalizePath)(`${photoFolder}/${photo.filename}`);
            const existing = this.app.vault.getAbstractFileByPath(destPath);
            if (existing instanceof import_obsidian.TFile)
              await this.app.vault.modifyBinary(existing, buffer);
            else
              await this.app.vault.createBinary(destPath, buffer);
          }
        }
      }
    }
    // Copy new GPX files
    for (const route of newRoutes) {
      if (route.gpxContent && route.gpxFileName) {
        const routePath = (0, import_obsidian.normalizePath)(`${folder}/${route.gpxFileName}`);
        const f = this.app.vault.getAbstractFileByPath(routePath);
        if (typeof route.gpxContent === "string") {
          if (f instanceof import_obsidian.TFile) await this.app.vault.modify(f, route.gpxContent);
          else await this.app.vault.create(routePath, route.gpxContent);
        } else {
          if (f instanceof import_obsidian.TFile) await this.app.vault.modifyBinary(f, route.gpxContent);
          else await this.app.vault.createBinary(routePath, route.gpxContent);
        }
      }
    }
    // Combine routes and locations
    const allRoutes = [...existingRoutes, ...newRoutes.map((r) => ({
      id: r.id, name: r.name, date: r.date || "",
      gpx: r.gpxFileName || "", distance_km: r.stats?.distanceKm || 0,
      elevation_gain: r.stats?.elevationGainM || 0, elevation_loss: r.stats?.elevationLossM || 0,
      sortOrder: r.sortOrder
    }))];
    const allLocations = [...existingLocations, ...newLocations];
    // Build route objects for generator
    const routeObjs = allRoutes.map((r) => ({
      id: r.id, name: r.name, date: r.date || "", gpxFileName: r.gpx || "",
      stats: { distanceKm: r.distance_km || 0, elevationGainM: r.elevation_gain || 0, elevationLossM: r.elevation_loss || 0 },
      sortOrder: r.sortOrder || 0
    }));
    // Regenerate markdown (version-aware)
    const newConfig = {
      name: parsed.config.name,
      date: parsed.config.date,
      endDate: parsed.config.endDate || "",
      region: parsed.config.region,
      description: parsed.config.description
    };
    const useV5 = parsed.version >= 5;
    const markdown = useV5
      ? generateJournalMarkdownV5(newConfig, routeObjs, allLocations)
      : generateJournalMarkdownV4(newConfig, routeObjs, allLocations);
    await this.app.vault.modify(journalMd, markdown);
    // Update index
    const trip = await this.buildTripFromParsed(tripId, folder, parseJournalMarkdown(markdown));
    if (trip) {
      const summary = this.toSummary(trip);
      this.index.trips = this.index.trips.filter((t) => t.id !== tripId);
      this.index.trips.push(summary);
      await this.saveIndex();
    }
    return trip;
  }
};

// src/library-view.ts
var import_obsidian2 = require("obsidian");
init_track_parser();
var L2 = __toESM(require_leaflet_src());
delete L2.Icon.Default.prototype._getIconUrl;
L2.Icon.Default.mergeOptions({
  iconUrl: "",
  iconRetinaUrl: "",
  shadowUrl: ""
});
var LIBRARY_VIEW_TYPE = "hiking-journal-library";
var LibraryView = class extends import_obsidian2.ItemView {
  constructor(leaf) {
    super(leaf);
    this.markers = [];
    this.gpxLayers = [];
    this.gpxLoaded = /* @__PURE__ */ new Set();
  }
  getViewType() {
    return LIBRARY_VIEW_TYPE;
  }
  getDisplayText() {
    return "HikerScrolls";
  }
  getIcon() {
    return "hiking-journal";
  }
  setup(cb) {
    this.cb = cb;
  }
  async onOpen() {
    this.render();
  }
  onClose() {
    this._mapResizeObs?.disconnect();
    this._mapResizeObs = void 0;
    this.map?.remove();
    this.map = void 0;
    this.markers = [];
    this.gpxLayers = [];
    this.gpxLoaded.clear();
  }
  render() {
    if (!this.cb)
      return;
    const el = this.containerEl.children[1];
    el.empty();
    el.addClass("hj-atlas-container");
    const root = el.createDiv({ cls: "hj-atlas-root" });
    const header = root.createDiv({ cls: "hj-atlas-header" });
    header.createDiv({ cls: "hj-atlas-title" }).createEl("span", { text: "hiking journal", cls: "hj-atlas-logo" });
    const actions = header.createDiv({ cls: "hj-atlas-actions" });
    this.mkBtn(actions, "+ New Journal", "hj-btn-primary hj-btn-sm", () => this.cb?.onInitJournal());
    this.mkBtn(actions, "\u{1F30D}", "hj-btn-secondary hj-btn-sm", () => {
      this.map?.fitBounds([[-60, -170], [70, 170]], { padding: [20, 20], animate: true });
    });
    this.statsEl = root.createDiv({ cls: "hj-atlas-stats" });
    this.updateStats();
    const mapDiv = root.createDiv({ cls: "hj-atlas-map" });
    this.map = L2.map(mapDiv, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: false
    });
    setTimeout(() => this.map?.invalidateSize(), 100);
    // Keep map in sync when container resizes (sidebar open/close, window resize)
    this._mapResizeObs = new ResizeObserver(() => {
      this.map?.invalidateSize({ animate: false });
    });
    this._mapResizeObs.observe(mapDiv);
    L2.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap &copy; CARTO"
    }).addTo(this.map);
    const topoLayer = L2.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      subdomains: "abc",
      maxZoom: 17,
      opacity: 0
    }).addTo(this.map);
    this.map.on("zoomend", () => {
      const z2 = this.map.getZoom();
      topoLayer.setOpacity(z2 >= 10 ? Math.min(0.4, (z2 - 10) * 0.1) : 0);
    });
    L2.control.zoom({ position: "bottomright" }).addTo(this.map);
    L2.control.attribution({ position: "bottomleft", prefix: false }).addAttribution('&copy; <a href="https://carto.com">CARTO</a> &middot; <a href="https://opentopomap.org">OpenTopoMap</a>').addTo(this.map);
    this.addMarkers();
    this.map.on("zoomend moveend", () => this.loadVisibleGpx());
  }
  // === Markers ===
  addMarkers() {
    if (!this.cb || !this.map)
      return;
    this.markers.forEach((m2) => m2.remove());
    this.markers = [];
    const trips = this.cb.manager.getIndex().trips.filter((t2) => t2.centerLat != null && t2.centerLng != null);
    const dotIcon = L2.divIcon({
      className: "hj-map-dot",
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    for (const trip of trips) {
      const marker2 = L2.marker([trip.centerLat, trip.centerLng], { icon: dotIcon }).addTo(this.map);
      marker2.bindTooltip(trip.name, {
        permanent: true,
        direction: "right",
        offset: [10, 0],
        className: "hj-map-tooltip"
      });
      const popupContent = document.createElement("div");
      popupContent.className = "hj-map-popup-content";
      // Cover thumbnail
      const coverWrap = document.createElement("div");
      coverWrap.className = "hj-popup-cover";
      popupContent.appendChild(coverWrap);
      this.loadPopupCover(trip, coverWrap);
      popupContent.insertAdjacentHTML("beforeend", `
        <div class="hj-map-popup-name">${trip.name}</div>
        <div class="hj-map-popup-meta">
          ${trip.region ? "<span>\u{1F4CD} " + trip.region + "</span>" : ""}
          ${trip.date ? "<span>\u{1F4C5} " + trip.date + "</span>" : ""}
          ${trip.distanceKm ? "<span>" + trip.distanceKm.toFixed(1) + " km</span>" : ""}
        </div>
      `);
      const btnRow = document.createElement("div");
      btnRow.className = "hj-popup-actions";
      popupContent.appendChild(btnRow);
      const openBtn = btnRow.createEl("button", {
        text: "Open Journal",
        cls: "hj-btn-primary hj-btn-sm"
      });
      openBtn.addEventListener("click", () => this.cb?.onOpenTrip(trip.id));
      const addRouteBtn = btnRow.createEl("button", {
        text: "+ Add Route",
        cls: "hj-btn-secondary hj-btn-sm"
      });
      addRouteBtn.addEventListener("click", () => this.cb?.onAddRoute?.(trip.id));
      const aiBtn = btnRow.createEl("button", {
        text: "AI Summary",
        cls: "hj-btn-secondary hj-btn-sm"
      });
      // AI summary result area
      const aiResultEl = document.createElement("div");
      aiResultEl.className = "hj-popup-ai-result";
      aiResultEl.style.display = "none";
      popupContent.appendChild(aiResultEl);
      aiBtn.addEventListener("click", async () => {
        const apiKey = this.cb?.settings?.geminiApiKey;
        const model = this.cb?.settings?.geminiModel;
        if (!apiKey) {
          aiResultEl.style.display = "block";
          aiResultEl.innerHTML = '<span style="color:var(--text-muted);font-style:italic;">Set Gemini API key in Settings</span>';
          return;
        }
        aiBtn.disabled = true;
        aiBtn.textContent = "Analyzing...";
        aiResultEl.style.display = "block";
        aiResultEl.textContent = "Loading...";
        try {
          const summary = await summarizeTripWithGemini(trip, apiKey, model);
          aiResultEl.innerHTML = `<div class="hj-popup-ai-title">AI Trip Summary</div><div class="hj-popup-ai-text">${summary}</div>`;
        } catch (e) {
          aiResultEl.innerHTML = `<span style="color:#dc2626;">Error: ${e.message}</span>`;
        }
        aiBtn.textContent = "AI Summary";
        aiBtn.disabled = false;
        // Update popup size
        marker2.getPopup()?.update();
      });
      const delBtn = btnRow.createEl("button", {
        text: "\u{1F5D1} Delete",
        cls: "hj-btn-secondary hj-btn-sm hj-btn-danger"
      });
      delBtn.addEventListener("click", async () => {
        if (confirm(`Delete "${trip.name}"?`)) {
          await this.cb?.onDeleteTrip(trip.id);
          this.render();
        }
      });
      marker2.bindPopup(popupContent, { maxWidth: 300, closeButton: true });
      marker2.on("click", () => {
        this.map?.flyTo([trip.centerLat, trip.centerLng], 12, { duration: 1.5 });
      });
      this.markers.push(marker2);
    }
  }
  // === GPX Track Previews ===
  async loadVisibleGpx() {
    if (!this.cb || !this.map)
      return;
    if (this.map.getZoom() < 6)
      return;
    const bounds = this.map.getBounds();
    const trips = this.cb.manager.getIndex().trips.filter((t2) => t2.centerLat != null && t2.centerLng != null);
    for (const trip of trips) {
      if (this.gpxLoaded.has(trip.id))
        continue;
      if (!bounds.contains([trip.centerLat, trip.centerLng]))
        continue;
      this.gpxLoaded.add(trip.id);
      this.loadTripGpx(trip).catch(() => {
      });
    }
  }
  async loadTripGpx(trip) {
    if (!this.map)
      return;
    const folder = `hiking-journal/${trip.id}`;
    const routeColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
    const mdFiles = this.app.vault.getFiles().filter(
      (f2) => f2.path.startsWith((0, import_obsidian2.normalizePath)(folder) + "/") && f2.extension === "md"
    );
    for (const md of mdFiles) {
      const content = await this.app.vault.read(md);
      if (!content.includes("type: hiking-journal"))
        continue;
      // V4: Check for routes_json first (multi-GPX)
      const routesJsonMatch = content.match(/^routes_json:\s*'((?:[^']|'')+)'/m);
      if (routesJsonMatch) {
        try {
          const routes = JSON.parse(routesJsonMatch[1].replace(/''/g, "'"));
          let colorIdx = 0;
          for (const route of routes) {
            if (!route.gpx) continue;
            const gpxFile = this.app.vault.getAbstractFileByPath(
              (0, import_obsidian2.normalizePath)(`${folder}/${route.gpx.trim()}`)
            );
            if (!(gpxFile instanceof import_obsidian2.TFile)) continue;
            try {
              const result = parseTrackText(await this.app.vault.read(gpxFile), gpxFile.name);
              if (result.trackPoints.length < 2) continue;
              const pts = result.trackPoints;
              const step = Math.max(1, Math.floor(pts.length / 200));
              const latLngs = [];
              for (let i = 0; i < pts.length; i += step) {
                latLngs.push(L2.latLng(pts[i].lat, pts[i].lng));
              }
              latLngs.push(L2.latLng(pts[pts.length - 1].lat, pts[pts.length - 1].lng));
              const color = routeColors[colorIdx % routeColors.length];
              colorIdx++;
              const shadow = L2.polyline(latLngs, {
                color: color.replace(")", ", 0.2)").replace("rgb", "rgba").replace("#", ""),
                weight: 6, lineCap: "round", lineJoin: "round", opacity: 0.2
              }).addTo(this.map);
              const line = L2.polyline(latLngs, {
                color, weight: 3, lineCap: "round", lineJoin: "round"
              }).addTo(this.map);
              this.gpxLayers.push(shadow, line);
            } catch (e) {
              console.warn(`[HJ] Failed to load route ${route.gpx}:`, e);
            }
          }
        } catch (e) {
          console.warn("[HJ] Failed to parse routes_json:", e);
        }
        return;
      }
      // V3 fallback: single gpx field
      const gpxMatch = content.match(/^gpx:\s*"?([^"\n]+)"?/m);
      let latLngs = [];
      if (gpxMatch) {
        const gpxFile = this.app.vault.getAbstractFileByPath(
          (0, import_obsidian2.normalizePath)(`${folder}/${gpxMatch[1].trim()}`)
        );
        if (!(gpxFile instanceof import_obsidian2.TFile))
          return;
        const result = parseTrackText(await this.app.vault.read(gpxFile), gpxFile.name);
        if (result.trackPoints.length < 2)
          return;
        const pts = result.trackPoints;
        const step = Math.max(1, Math.floor(pts.length / 200));
        for (let i2 = 0; i2 < pts.length; i2 += step) {
          latLngs.push(L2.latLng(pts[i2].lat, pts[i2].lng));
        }
        latLngs.push(L2.latLng(pts[pts.length - 1].lat, pts[pts.length - 1].lng));
      } else {
        const re2 = /@location\(([^,]+),\s*([^,)]+)/g;
        let m2;
        while (m2 = re2.exec(content)) {
          const lat = parseFloat(m2[1]), lng = parseFloat(m2[2]);
          if (lat && lng)
            latLngs.push(L2.latLng(lat, lng));
        }
      }
      if (latLngs.length >= 2) {
        const shadow = L2.polyline(latLngs, {
          color: "rgba(239, 68, 68, 0.2)",
          weight: 6,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(this.map);
        const line = L2.polyline(latLngs, {
          color: "#ef4444",
          weight: 3,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(this.map);
        this.gpxLayers.push(shadow, line);
      }
      return;
    }
  }
  // === Popup Cover ===
  async loadPopupCover(trip, coverDiv) {
    try {
      const folder = `hiking-journal/${trip.id}`;
      const imgFiles = this.app.vault.getFiles().filter(
        (f) => f.path.startsWith(folder + "/") && /\.(jpe?g|png|webp|gif)$/i.test(f.name)
      );
      if (imgFiles.length > 0) {
        // Pick the largest file for best quality
        imgFiles.sort((a, b) => (b.stat?.size || 0) - (a.stat?.size || 0));
        const buf = await this.app.vault.readBinary(imgFiles[0]);
        const blob = new Blob([buf]);
        const url = URL.createObjectURL(blob);
        const img = document.createElement("img");
        img.src = url;
        img.alt = trip.name;
        img.addEventListener("load", () => URL.revokeObjectURL(url));
        coverDiv.appendChild(img);
      }
    } catch {
    }
  }
  // === Stats ===
  updateStats() {
    if (!this.cb || !this.statsEl)
      return;
    const trips = this.cb.manager.getIndex().trips;
    const km = trips.reduce((s2, t2) => s2 + (t2.distanceKm || 0), 0);
    const regions = new Set(trips.map((t2) => t2.region).filter(Boolean));
    this.statsEl.innerHTML = "";
    for (const [v2, l2] of [
      [String(trips.length), "trips"],
      [km > 0 ? km.toFixed(0) : "0", "km"],
      [String(regions.size), "regions"]
    ]) {
      const d2 = this.statsEl.createDiv({ cls: "hj-atlas-stat" });
      d2.createEl("span", { text: v2, cls: "hj-atlas-stat-val" });
      d2.createEl("span", { text: l2, cls: "hj-atlas-stat-label" });
    }
  }
  mkBtn(par, text, cls, fn) {
    const b2 = par.createEl("button", { text, cls });
    b2.addEventListener("click", () => fn());
  }
};

// src/timeline-view.ts
var TIMELINE_VIEW_TYPE = "hiking-journal-timeline";
var TimelineView = class extends import_obsidian2.ItemView {
  constructor(leaf) {
    super(leaf);
  }
  getViewType() {
    return TIMELINE_VIEW_TYPE;
  }
  getDisplayText() {
    return "Journal Timeline";
  }
  getIcon() {
    return "clock";
  }
  setup(cb) {
    this.cb = cb;
  }
  async onOpen() {
    this.render();
  }
  onClose() {
  }
  render() {
    if (!this.cb) return;
    const el = this.containerEl.children[1];
    el.empty();
    el.addClass("hj-timeline-container");
    const header = el.createDiv({ cls: "hj-timeline-header" });
    const titleRow = header.createDiv({ cls: "hj-timeline-title-row" });
    titleRow.createEl("h3", { text: "Journal Timeline" });
    const homeBtn = titleRow.createEl("button", { text: "\u{1F30D}", cls: "hj-timeline-home-btn", attr: { title: "Back to Atlas" } });
    homeBtn.addEventListener("click", () => this.cb?.onGoHome?.());
    // Search box
    const searchInput = header.createEl("input", {
      cls: "hj-timeline-search",
      attr: { type: "text", placeholder: "Search journals..." }
    });
    const trips = [...this.cb.manager.getIndex().trips];
    // Sort by date descending (newest first)
    trips.sort((a, b) => {
      const da = a.date || "";
      const db = b.date || "";
      return db.localeCompare(da);
    });
    if (trips.length === 0) {
      el.createDiv({ cls: "hj-timeline-empty", text: "No journals yet." });
      return;
    }
    const list = el.createDiv({ cls: "hj-timeline-list" });
    const renderList = (filter) => {
      list.empty();
      const q = (filter || "").toLowerCase().trim();
      const filtered = q ? trips.filter((t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.region || "").toLowerCase().includes(q) ||
        (t.date || "").includes(q)
      ) : trips;
      if (filtered.length === 0) {
        list.createDiv({ cls: "hj-timeline-empty", text: "No matching journals." });
        return;
      }
      let currentYear = "";
      for (const trip of filtered) {
        const year = trip.date ? trip.date.substring(0, 4) : "Unknown";
        if (year !== currentYear) {
          currentYear = year;
          list.createDiv({ cls: "hj-timeline-year", text: year });
        }
        const card = list.createDiv({ cls: "hj-timeline-card" });
        card.addEventListener("click", () => this.cb?.onFlyToTrip(trip.id));
        // Cover image area
        const coverDiv = card.createDiv({ cls: "hj-timeline-cover" });
        this.loadCoverImage(trip, coverDiv);
        // Info area
        const info = card.createDiv({ cls: "hj-timeline-info" });
        info.createEl("div", { text: trip.name, cls: "hj-timeline-name" });
        const meta = info.createDiv({ cls: "hj-timeline-meta" });
        if (trip.date) {
          meta.createEl("span", { text: "\u{1F4C5} " + trip.date });
        }
        if (trip.distanceKm) {
          meta.createEl("span", { text: "\u{1F6B6} " + trip.distanceKm.toFixed(1) + " km" });
        }
        if (trip.region) {
          info.createEl("div", { text: trip.region, cls: "hj-timeline-region" });
        }
      }
    };
    renderList("");
    searchInput.addEventListener("input", () => renderList(searchInput.value));
  }
  async loadCoverImage(trip, coverDiv) {
    try {
      const folder = `hiking-journal/${trip.id}`;
      const allFiles = this.app.vault.getFiles().filter(
        (f) => f.path.startsWith(folder + "/") && /\.(jpe?g|png|webp|gif)$/i.test(f.name)
      );
      if (allFiles.length > 0) {
        // Pick the largest file for best quality (consistent with popup cover)
        allFiles.sort((a, b) => (b.stat?.size || 0) - (a.stat?.size || 0));
        const imgFile = allFiles[0];
        const buf = await this.app.vault.readBinary(imgFile);
        const blob = new Blob([buf]);
        const url = URL.createObjectURL(blob);
        const img = coverDiv.createEl("img");
        img.src = url;
        img.alt = trip.name;
        img.addEventListener("load", () => URL.revokeObjectURL(url));
      } else {
        coverDiv.createDiv({ cls: "hj-timeline-cover-placeholder", text: "\u{1F3D4}" });
      }
    } catch {
      coverDiv.createDiv({ cls: "hj-timeline-cover-placeholder", text: "\u{1F3D4}" });
    }
  }
};

// src/trip-view.ts
var import_obsidian3 = require("obsidian");
var TRIP_VIEW_TYPE = "hiking-journal-trip";
var TILE = 256;
var POOL = 800;
var CAM_OX = 0.7;
var CAM_OY = 0.5;
var STADIA_API_KEY = "";
var MAP_STYLES = {
  "opentopomap": {
    name: "OpenTopoMap",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    subs: ["a", "b", "c"],
    filter: "grayscale(100%) contrast(1.5) opacity(0.4)",
    ext: "png"
  },
  "carto-voyager": {
    name: "CARTO Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    subs: ["a", "b", "c", "d"],
    filter: "opacity(0.45) saturate(0.7)",
    ext: "png"
  },
  "esri-satellite": {
    name: "Esri Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    subs: [],
    filter: "opacity(0.5) saturate(0.6)",
    ext: "jpg"
  },
  "osm": {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    subs: [],
    filter: "grayscale(100%) contrast(1.3) opacity(0.35)",
    ext: "png"
  },
  "carto-light": {
    name: "CARTO Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
    subs: ["a", "b", "c", "d"],
    filter: "opacity(0.5)",
    ext: "png"
  },
  "carto-dark": {
    name: "CARTO Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    subs: ["a", "b", "c", "d"],
    filter: "opacity(0.5)",
    ext: "png"
  },
  "stamen-toner": {
    name: "Stamen Toner",
    url: "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png",
    subs: [],
    filter: "opacity(0.4)",
    ext: "png",
    needsApiKey: true
  },
  "stamen-watercolor": {
    name: "Stamen Watercolor",
    url: "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
    subs: [],
    filter: "opacity(0.45)",
    ext: "jpg",
    needsApiKey: true
  },
  "stamen-terrain": {
    name: "Stamen Terrain",
    url: "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png",
    subs: [],
    filter: "opacity(0.45) saturate(0.8)",
    ext: "png",
    needsApiKey: true
  },
  "esri-natgeo": {
    name: "Esri NatGeo World Map",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
    subs: [],
    filter: "opacity(0.5) saturate(0.8)",
    ext: "jpg"
  },
  "esri-topo": {
    name: "Esri World Topo",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    subs: [],
    filter: "opacity(0.45) saturate(0.7)",
    ext: "jpg"
  },
  "stadia-smooth": {
    name: "Alidade Smooth",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}.png",
    subs: [],
    filter: "opacity(0.45)",
    ext: "png",
    needsApiKey: true
  },
  "antique": {
    name: "Antique Map",
    url: "https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg",
    subs: [],
    filter: "opacity(0.5) sepia(0.6) saturate(0.7) contrast(1.1)",
    ext: "jpg",
    needsApiKey: true
  }
};
function lon2t(lon, z2) {
  return (lon + 180) / 360 * (1 << z2);
}
function lat2t(lat, z2) {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * (1 << z2);
}
function autoZoom(latSpan, lngSpan) {
  const narrow = Math.min(latSpan, lngSpan);
  let z2;
  if (narrow > 0.4)
    z2 = 11;
  else if (narrow > 0.2)
    z2 = 12;
  else if (narrow > 0.1)
    z2 = 13;
  else if (narrow > 0.04)
    z2 = 14;
  else
    z2 = 15;
  const wide = Math.max(latSpan, lngSpan);
  if (wide > 1 && z2 > 11)
    z2 = 11;
  else if (wide > 0.5 && z2 > 12)
    z2 = 12;
  return z2;
}
function buildGeo(bounds) {
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;
  const zoom = autoZoom(latSpan, lngSpan);
  const pad = 0.15;
  const rMinTX = lon2t(bounds.west - lngSpan * pad, zoom);
  const rMaxTX = lon2t(bounds.east + lngSpan * pad, zoom);
  const rMinTY = lat2t(bounds.north + latSpan * pad, zoom);
  const rMaxTY = lat2t(bounds.south - latSpan * pad, zoom);
  return { zoom, w: (rMaxTX - rMinTX) * TILE, h: (rMaxTY - rMinTY) * TILE, minTX: rMinTX, minTY: rMinTY };
}
function proj(lat, lng, g2) {
  return { x: (lon2t(lng, g2.zoom) - g2.minTX) * TILE, y: (lat2t(lat, g2.zoom) - g2.minTY) * TILE };
}
function projectTrack(track, g2) {
  const route = track.map((p2) => proj(p2.lat, p2.lng, g2));
  const dists = [0];
  let total = 0;
  for (let i2 = 1; i2 < route.length; i2++) {
    total += Math.hypot(route[i2].x - route[i2 - 1].x, route[i2].y - route[i2 - 1].y);
    dists.push(total);
  }
  return { route, dists, total };
}
function nearestIdx(wp, route) {
  let best = 0, bestD = Infinity;
  for (let i2 = 0; i2 < route.length; i2++) {
    const d2 = (wp.x - route[i2].x) ** 2 + (wp.y - route[i2].y) ** 2;
    if (d2 < bestD) {
      bestD = d2;
      best = i2;
    }
  }
  return best;
}
function interpAt(dist, route, dists) {
  if (dist <= 0)
    return route[0];
  if (dist >= dists[dists.length - 1])
    return route[route.length - 1];
  for (let k2 = 1; k2 < route.length; k2++) {
    if (dists[k2] >= dist) {
      const seg = dists[k2] - dists[k2 - 1];
      const t2 = seg === 0 ? 0 : (dist - dists[k2 - 1]) / seg;
      return {
        x: route[k2 - 1].x + (route[k2].x - route[k2 - 1].x) * t2,
        y: route[k2 - 1].y + (route[k2].y - route[k2 - 1].y) * t2
      };
    }
  }
  return route[route.length - 1];
}
function S(tag, attrs, p2) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  if (attrs)
    for (const [k2, v2] of Object.entries(attrs))
      el.setAttribute(k2, v2);
  if (p2)
    p2.appendChild(el);
  return el;
}
function mkIcon(type) {
  const g2 = S("g", { fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" });
  if (type === "bus") {
    S("rect", { x: "2", y: "6", width: "20", height: "14", rx: "2", ry: "2" }, g2);
    S("path", { d: "M2 10h20" }, g2);
    S("path", { d: "M6 16v.01" }, g2);
    S("path", { d: "M18 16v.01" }, g2);
  } else {
    S("circle", { cx: "12", cy: "5", r: "1.5" }, g2);
    S("path", { d: "m9 20 3-6 3 6" }, g2);
    S("path", { d: "m6 8 6 2 6-2" }, g2);
    S("path", { d: "M12 10v4" }, g2);
  }
  return g2;
}
var TripView = class extends import_obsidian3.ItemView {
  constructor(leaf) {
    super(leaf);
    this.pts = [];
    // GPX track data (may be empty if no GPX)
    this.route = [];
    this.routeDists = [];
    this.totalDist = 0;
    this.hasTrack = false;
    this.cards = [];
    this.tilePool = [];
    // Route rendering refs (two modes)
    this.pathLine = null;
    // GPX mode: animated red polyline
    this.segs = [];
    // fallback mode: per-segment lines
    this.iBgs = [];
    // transport icon backgrounds
    this.iGs = [];
    // transport icon svg groups
    // Animation state
    this.raf = 0;
    this.cx = 0;
    this.cy = 0;
    this.kx = 0;
    this.ky = 0;
    this.ai = 0;
    this.cones = [];
    this.coneSvg = null;
    this.mainSvg = null;
    this.bubble = null;
    // User map interaction state
    this.userScale = 1;
    this.userOffX = 0;
    this.userOffY = 0;
    this.userPanning = false;
    this._dragState = null;
    this._panTimer = null;
  }
  getViewType() {
    return TRIP_VIEW_TYPE;
  }
  getDisplayText() {
    return this.mgr?.getLoadedTrip()?.name || "HikerScrolls";
  }
  getIcon() {
    return "hiking-journal";
  }
  setup(m2, cb, settings) {
    this.mgr = m2;
    this.onBack = cb;
    this.settings = settings || {};
  }
  getState() {
    const trip = this.mgr?.getLoadedTrip();
    return trip ? { tripId: trip.id } : {};
  }
  async setState(state, result) {
    if (state.tripId && this.mgr) {
      const loaded = this.mgr.getLoadedTrip();
      if (!loaded || loaded.id !== state.tripId) {
        await this.mgr.loadTrip(state.tripId);
      }
      await this.rebuild();
    }
    await super.setState(state, result);
  }
  async onOpen() {
    const trip = this.mgr?.getLoadedTrip();
    if (trip) await this.rebuild();
  }
  onClose() {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    // Cleanup file watcher for live markdown sync
    if (this._fileWatcherRef) {
      this.app.vault.offref(this._fileWatcherRef);
      this._fileWatcherRef = null;
    }
    if (this._reloadTimer) {
      clearTimeout(this._reloadTimer);
      this._reloadTimer = null;
    }
    this.tilePool = [];
    this.cards = [];
    this.segs = [];
    this.pathLine = null;
    this.bubble?.remove();
    this.bubble = null;
    if (this._cleanupMapListeners)
      this._cleanupMapListeners();
    if (this._panTimer)
      clearTimeout(this._panTimer);
  }
  // === Live Markdown Sync ===
  setupFileWatcher() {
    if (this._fileWatcherRef) {
      this.app.vault.offref(this._fileWatcherRef);
    }
    const trip = this.mgr?.getLoadedTrip();
    if (!trip) return;
    const folder = `hiking-journal/${trip.id}`;
    this._fileWatcherRef = this.app.vault.on("modify", (file) => {
      if (file.path.startsWith(folder) && file.path.endsWith(".md")) {
        // Debounce reload to avoid thrashing
        if (this._reloadTimer) clearTimeout(this._reloadTimer);
        this._reloadTimer = setTimeout(() => {
          this.reloadFromMd(trip.id);
        }, 500);
      }
    });
  }
  async reloadFromMd(tripId) {
    try {
      const reloaded = await this.mgr.loadTrip(tripId);
      if (reloaded) {
        console.log("[HJ] Live reload: markdown changed, rebuilding view");
        await this.rebuild();
      }
    } catch (err) {
      console.warn("[HJ] Live reload failed:", err);
    }
  }
  async rebuild() {
    const c2 = this.containerEl.children[1];
    this._loopGen = (this._loopGen || 0) + 1; // invalidate any running RAF loop
    if (this.raf) cancelAnimationFrame(this.raf);
    this._lastSp = void 0;
    this._lastScrollTop = void 0;
    c2.empty();
    const trip = this.mgr?.getLoadedTrip();
    if (!trip) {
      c2.createDiv({ text: "No trip data.", cls: "hj-empty" });
      return;
    }
    // Setup live markdown sync file watcher
    this.setupFileWatcher();
    this.mapStyle = trip.mapStyle || "opentopomap";
    const gpxTrack = trip.gpxTrack || [];
    const gpxBreaks = trip.gpxBreaks || [];
    const hasGpx = gpxTrack.length >= 2;
    let wps = trip.waypoints.filter((w2) => w2.lat && w2.lng);
    if (!wps.length && hasGpx) {
      wps = this.generateTrackStops(gpxTrack, trip.stats?.distanceKm || 0);
    }
    if (!wps.length && !hasGpx) {
      c2.createDiv({ text: "No GPS data.", cls: "hj-empty" });
      return;
    }
    if (!wps.length) {
      wps = [
        { id: "start", filename: "", vaultPath: "", lat: gpxTrack[0].lat, lng: gpxTrack[0].lng, alt: gpxTrack[0].ele, title: "Start", description: "", gpsSource: "gpx" },
        { id: "end", filename: "", vaultPath: "", lat: gpxTrack[gpxTrack.length - 1].lat, lng: gpxTrack[gpxTrack.length - 1].lng, alt: gpxTrack[gpxTrack.length - 1].ele, title: "Finish", description: "", gpsSource: "gpx" }
      ];
    }
    const allLats = wps.map((w2) => w2.lat);
    const allLngs = wps.map((w2) => w2.lng);
    this.hasTrack = hasGpx;
    this.tripVersion = trip.version || 4;
    if (this.hasTrack) {
      for (const tp of gpxTrack) {
        allLats.push(tp.lat);
        allLngs.push(tp.lng);
      }
    }
    const pad = 0.01;
    const bounds = {
      north: Math.max(...allLats) + pad,
      south: Math.min(...allLats) - pad,
      east: Math.max(...allLngs) + pad,
      west: Math.min(...allLngs) - pad
    };
    this.geo = buildGeo(bounds);
    if (this.hasTrack) {
      const pt2 = projectTrack(gpxTrack, this.geo);
      this.route = pt2.route;
      this.routeDists = pt2.dists;
      this.totalDist = pt2.total;
    } else {
      this.route = [];
      this.routeDists = [];
      this.totalDist = 0;
    }
    // Build per-segment distance ranges (for multi-route gap rendering)
    if (this.hasTrack && gpxBreaks.length > 0) {
      const breakPts = [0, ...gpxBreaks, this.route.length];
      this.routeSegData = [];
      for (let si = 0; si < breakPts.length - 1; si++) {
        const startIdx = breakPts[si];
        const endIdx = breakPts[si + 1] - 1;
        this.routeSegData.push({
          startIdx,
          endIdx,
          startDist: this.routeDists[startIdx] || 0,
          endDist: this.routeDists[endIdx] || 0
        });
      }
    } else {
      this.routeSegData = null;
    }
    this.pts = wps.map((w2) => {
      const xy = proj(w2.lat, w2.lng, this.geo);
      let pathIdx = 0, trackDist = 0;
      if (this.hasTrack) {
        pathIdx = nearestIdx(xy, this.route);
        trackDist = this.routeDists[pathIdx];
      }
      return { ...w2, ...xy, pathIdx, trackDist };
    });
    if (this.hasTrack) {
      this.pts.sort((a2, b2) => a2.pathIdx - b2.pathIdx);
    }
    this.cx = 0;
    this.cy = 0;
    this.kx = this.pts[0].x;
    this.ky = this.pts[0].y;
    this.ai = 0;
    this.prevAi = -1;
    this.cards = [];
    this.cardCtrs = [];
    this.dotRefs = [];
    this.segs = [];
    this.iBgs = [];
    this.iGs = [];
    this.tilePool = [];
    this.pathLine = null;
    this._lastTileCx = -9999;
    this._lastTileCy = -9999;
    this._svgRect = null;
    const root = c2.createDiv({ cls: `hj-root${this.tripVersion >= 5 ? " hj-v5" : ""}` });
    const wrap = root.createDiv({ cls: "hj-wrapper" });
    this.scrollEl = wrap.createDiv({ cls: "hj-scroll" });
    this.scrollEl.createDiv({ text: "\u2190 Back to Library", cls: "hj-back-btn" }).addEventListener("click", () => this.onBack());
    this.mkHeader(this.scrollEl, trip);
    let lastSection = "";
    for (let i2 = 0; i2 < this.pts.length; i2++) {
      // V5: insert section title headers between groups
      if (this.tripVersion >= 5 && this.pts[i2].sectionTitle && this.pts[i2].sectionTitle !== lastSection) {
        lastSection = this.pts[i2].sectionTitle;
        const secHeader = this.scrollEl.createDiv({ cls: "hj-section-divider" });
        secHeader.createEl("h2", { text: lastSection, cls: "hj-section-divider-title" });
      }
      this.cards.push(this.mkCard(this.scrollEl, this.pts[i2], i2));
    }
    this.svgBox = wrap.createDiv({ cls: "hj-map" });
    const svg = S("svg", {
      viewBox: `0 0 ${this.geo.w} ${this.geo.h}`,
      preserveAspectRatio: "xMidYMid slice",
      class: "hj-fullsvg",
      style: "overflow:visible"
    });
    this.svgBox.appendChild(svg);
    this.mainSvg = svg;
    const defs = S("defs", {}, svg);
    const gf = S("filter", { id: "glow", x: "-20%", y: "-20%", width: "140%", height: "140%" }, defs);
    S("feGaussianBlur", { stdDeviation: "3", result: "b" }, gf);
    S("feComposite", { in: "SourceGraphic", in2: "b", operator: "over" }, gf);
    const lg = S("filter", { id: "lGlow" }, defs);
    S("feGaussianBlur", { stdDeviation: "1.5", result: "cb" }, lg);
    const fm = S("feMerge", {}, lg);
    S("feMergeNode", { in: "cb" }, fm);
    S("feMergeNode", { in: "SourceGraphic" }, fm);
    this.mGrp = S("g", {}, svg);
    const tileFilter = (MAP_STYLES[this.mapStyle] || MAP_STYLES["opentopomap"]).filter;
    this.tileGroup = S("g", {
      style: `mix-blend-mode:multiply; filter:${tileFilter};`
    }, this.mGrp);
    for (let i2 = 0; i2 < POOL; i2++) {
      const img = S("image", {
        width: `${TILE + 0.5}`,
        height: `${TILE + 0.5}`,
        preserveAspectRatio: "none",
        style: "display:none"
      }, this.tileGroup);
      this.tilePool.push(img);
    }
    this.mkRoute(this.mGrp);
    this.mkDots(this.mGrp);
    const coneSvg = S("svg", {
      viewBox: `0 0 ${this.geo.w} ${this.geo.h}`,
      preserveAspectRatio: "xMidYMid slice",
      class: "hj-fullsvg hj-cone-layer",
      style: "overflow:visible"
    });
    wrap.appendChild(coneSvg);
    const coneDefs = S("defs", {}, coneSvg);
    const coneGrad = S("linearGradient", { id: "coneG", x1: "0%", y1: "50%", x2: "100%", y2: "50%" }, coneDefs);
    S("stop", { offset: "0%", "stop-color": "rgba(0,0,0,0.18)" }, coneGrad);
    S("stop", { offset: "100%", "stop-color": "rgba(0,0,0,0)" }, coneGrad);
    this.coneSvg = coneSvg;
    this.cones = [];
    // === Map style switcher overlay ===
    const mapSwitcher = wrap.createDiv({ cls: "hj-map-switcher" });
    const mapSelect = mapSwitcher.createEl("select", { cls: "hj-map-switcher-select" });
    for (const [key, style] of Object.entries(MAP_STYLES)) {
      const opt = mapSelect.createEl("option", { text: style.name, value: key });
      if (key === this.mapStyle) opt.selected = true;
    }
    mapSelect.addEventListener("change", () => {
      this.switchMapStyle(mapSelect.value);
    });
    this.svgBox.addEventListener("click", () => {
      this.rmBubble();
    });
    // === Map interaction: drag to pan, wheel to zoom, double-click to reset ===
    this.userScale = 1;
    this.userOffX = 0;
    this.userOffY = 0;
    this.userPanning = false;
    this._dragState = null;
    this.svgBox.style.cursor = "grab";
    // Drag to pan
    this.svgBox.addEventListener("mousedown", (e2) => {
      if (e2.button !== 0)
        return;
      e2.preventDefault();
      this._dragState = { x: e2.clientX, y: e2.clientY };
      this.userPanning = true;
      this.svgBox.style.cursor = "grabbing";
      if (this._panTimer)
        clearTimeout(this._panTimer);
    });
    const onMouseMove = (e2) => {
      if (!this._dragState)
        return;
      const sr = this.svgBox.getBoundingClientRect();
      const vbW = this.geo.w / this.userScale;
      const sc = Math.max(sr.width / vbW, sr.height / (this.geo.h / this.userScale));
      const dx = (e2.clientX - this._dragState.x) / sc;
      const dy = (e2.clientY - this._dragState.y) / sc;
      this.userOffX += dx;
      this.userOffY += dy;
      this._dragState.x = e2.clientX;
      this._dragState.y = e2.clientY;
    };
    const onMouseUp = () => {
      if (!this._dragState)
        return;
      this._dragState = null;
      this.svgBox.style.cursor = "grab";
      this._panTimer = setTimeout(() => {
        this.userPanning = false;
      }, 3000);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    // Wheel to zoom
    this.svgBox.addEventListener("wheel", (e2) => {
      e2.preventDefault();
      const factor = e2.deltaY > 0 ? 0.9 : 1.1;
      this.userScale = Math.max(0.5, Math.min(5, this.userScale * factor));
      this.updateMapViewBox();
      this.userPanning = true;
      if (this._panTimer)
        clearTimeout(this._panTimer);
      this._panTimer = setTimeout(() => {
        this.userPanning = false;
      }, 3000);
    }, { passive: false });
    // Double-click to reset
    this.svgBox.addEventListener("dblclick", (e2) => {
      e2.preventDefault();
      this.userScale = 1;
      this.userOffX = 0;
      this.userOffY = 0;
      this.userPanning = false;
      if (this._panTimer)
        clearTimeout(this._panTimer);
      this.updateMapViewBox();
    });
    // Touch support for pinch-zoom
    let lastTouchDist = 0;
    this.svgBox.addEventListener("touchstart", (e2) => {
      if (e2.touches.length === 2) {
        const dx = e2.touches[0].clientX - e2.touches[1].clientX;
        const dy = e2.touches[0].clientY - e2.touches[1].clientY;
        lastTouchDist = Math.hypot(dx, dy);
      } else if (e2.touches.length === 1) {
        this._dragState = { x: e2.touches[0].clientX, y: e2.touches[0].clientY };
        this.userPanning = true;
        if (this._panTimer)
          clearTimeout(this._panTimer);
      }
    }, { passive: true });
    this.svgBox.addEventListener("touchmove", (e2) => {
      if (e2.touches.length === 2) {
        e2.preventDefault();
        const dx = e2.touches[0].clientX - e2.touches[1].clientX;
        const dy = e2.touches[0].clientY - e2.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastTouchDist > 0) {
          const factor = dist / lastTouchDist;
          this.userScale = Math.max(0.5, Math.min(5, this.userScale * factor));
          this.updateMapViewBox();
        }
        lastTouchDist = dist;
      } else if (e2.touches.length === 1 && this._dragState) {
        const sr = this.svgBox.getBoundingClientRect();
        const vbW = this.geo.w / this.userScale;
        const sc = Math.max(sr.width / vbW, sr.height / (this.geo.h / this.userScale));
        const tdx = (e2.touches[0].clientX - this._dragState.x) / sc;
        const tdy = (e2.touches[0].clientY - this._dragState.y) / sc;
        this.userOffX += tdx;
        this.userOffY += tdy;
        this._dragState.x = e2.touches[0].clientX;
        this._dragState.y = e2.touches[0].clientY;
      }
    }, { passive: false });
    this.svgBox.addEventListener("touchend", () => {
      lastTouchDist = 0;
      this._dragState = null;
      this._panTimer = setTimeout(() => {
        this.userPanning = false;
      }, 3000);
    }, { passive: true });
    // Clean up listeners on destroy
    this._cleanupMapListeners = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    // Cache card centers and svgBox rect; recalculate on resize
    this._cacheCardCtrs();
    this._svgRect = this.svgBox.getBoundingClientRect();
    this._resizeObs = new ResizeObserver(() => {
      this._cacheCardCtrs();
      this._svgRect = this.svgBox.getBoundingClientRect();
    });
    this._resizeObs.observe(this.scrollEl);
    this._resizeObs.observe(this.svgBox);
    this.cards.forEach((c2) => this._resizeObs.observe(c2));
    // Activate first card + dot on startup
    this.syncCards(-1, 0);
    this.syncDots(-1, 0);
    this.startLoop();
  }
  /* ===== MAP VIEWBOX (zoom) ===== */
  updateMapViewBox() {
    const s = this.userScale;
    const vbW = this.geo.w / s;
    const vbH = this.geo.h / s;
    const vbX = this.geo.w * CAM_OX * (1 - 1 / s);
    const vbY = this.geo.h * CAM_OY * (1 - 1 / s);
    const vb = `${vbX} ${vbY} ${vbW} ${vbH}`;
    this.mainSvg.setAttribute("viewBox", vb);
    this.coneSvg.setAttribute("viewBox", vb);
    this._lastTileCx = -9999;
    this._lastTileCy = -9999;
  }
  /* ===== SWITCH MAP STYLE (live) ===== */
  async switchMapStyle(styleKey) {
    const ms = MAP_STYLES[styleKey];
    if (!ms) return;
    this.mapStyle = styleKey;
    // Update tile group CSS filter
    if (this.tileGroup) {
      this.tileGroup.setAttribute("style", `mix-blend-mode:multiply; filter:${ms.filter};`);
    }
    // Flush all tile URLs so syncTiles() re-fetches with new provider
    for (const node of this.tilePool) {
      node.removeAttribute("href");
      node.style.display = "none";
    }
    // Force immediate tile refresh (bypass throttle)
    this._lastTileCx = -9999;
    this._lastTileCy = -9999;
    // Persist to frontmatter
    const trip = this.mgr?.getLoadedTrip();
    if (trip && this.mgr) {
      trip.mapStyle = styleKey;
      const folder = `hiking-journal/${trip.id}`;
      const mdPath = (0, import_obsidian3.normalizePath)(`${folder}/${trip.id}.md`);
      try {
        const file = this.mgr.app.vault.getAbstractFileByPath(mdPath);
        if (file) {
          let content = await this.mgr.app.vault.read(file);
          if (content.includes("map_style:")) {
            content = content.replace(/map_style:.*/, `map_style: "${styleKey}"`);
          } else {
            // Insert map_style after the opening ---\n line
            content = content.replace(/^---\n/, `---\nmap_style: "${styleKey}"\n`);
          }
          await this.mgr.app.vault.modify(file, content);
        }
      } catch (err) {
        console.warn("[HJ] Failed to persist map_style:", err);
      }
    }
  }
  /* ===== GPX-ONLY: Auto-generate scroll stops ===== */
  generateTrackStops(track, totalKm) {
    if (track.length < 2)
      return [];
    const R2 = 6371;
    const dists = [0];
    let cumDist = 0;
    for (let i2 = 1; i2 < track.length; i2++) {
      const dLat = (track[i2].lat - track[i2 - 1].lat) * Math.PI / 180;
      const dLon = (track[i2].lng - track[i2 - 1].lng) * Math.PI / 180;
      const a2 = Math.sin(dLat / 2) ** 2 + Math.cos(track[i2 - 1].lat * Math.PI / 180) * Math.cos(track[i2].lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      cumDist += R2 * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
      dists.push(cumDist);
    }
    const actualKm = totalKm > 0 ? totalKm : cumDist;
    const numStops = Math.max(3, Math.min(10, Math.round(actualKm / 1.5)));
    const stops = [];
    for (let s2 = 0; s2 < numStops; s2++) {
      const frac = s2 / (numStops - 1);
      const targetDist = frac * cumDist;
      let lat = track[0].lat, lng = track[0].lng, ele = track[0].ele;
      for (let k2 = 1; k2 < track.length; k2++) {
        if (dists[k2] >= targetDist) {
          const seg = dists[k2] - dists[k2 - 1];
          const t2 = seg === 0 ? 0 : (targetDist - dists[k2 - 1]) / seg;
          lat = track[k2 - 1].lat + (track[k2].lat - track[k2 - 1].lat) * t2;
          lng = track[k2 - 1].lng + (track[k2].lng - track[k2 - 1].lng) * t2;
          if (track[k2 - 1].ele != null && track[k2].ele != null) {
            ele = track[k2 - 1].ele + (track[k2].ele - track[k2 - 1].ele) * t2;
          }
          break;
        }
      }
      const km = frac * actualKm;
      let title;
      if (s2 === 0)
        title = "Start";
      else if (s2 === numStops - 1)
        title = "Finish";
      else
        title = `${km.toFixed(1)} km`;
      stops.push({
        id: `track-stop-${s2}`,
        filename: "",
        vaultPath: "",
        lat,
        lng,
        alt: ele != null ? Math.round(ele) : void 0,
        title,
        description: s2 === 0 ? "Beginning of route" : s2 === numStops - 1 ? "End of route" : `${km.toFixed(1)} km along the route`,
        gpsSource: "gpx"
      });
    }
    return stops;
  }
  /* ===== ROUTE RENDERING ===== */
  mkRoute(g2) {
    if (this.hasTrack) {
      const segs = this.routeSegData || [{
        startIdx: 0,
        endIdx: this.route.length - 1,
        startDist: 0,
        endDist: this.totalDist
      }];
      this.routePathLines = [];
      for (const seg of segs) {
        const segPts = this.route.slice(seg.startIdx, seg.endIdx + 1)
          .map((p2) => `${p2.x},${p2.y}`).join(" ");
        const segLen = seg.endDist - seg.startDist;
        S("polyline", {
          points: segPts,
          fill: "none",
          stroke: "#cbd5e1",
          "stroke-width": "2.5",
          "stroke-dasharray": "6,6",
          "stroke-linecap": "round",
          "stroke-linejoin": "round"
        }, g2);
        const pl = S("polyline", {
          points: segPts,
          fill: "none",
          stroke: "#ef4444",
          "stroke-width": "3.5",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          filter: "url(#lGlow)"
        }, g2);
        pl.style.strokeDasharray = `${segLen}`;
        pl.style.strokeDashoffset = `${segLen}`;
        this.routePathLines.push({ line: pl, startDist: seg.startDist, endDist: seg.endDist, segLen });
      }
      this.pathLine = this.routePathLines[0]?.line || null;
      for (let i2 = 0; i2 < this.pts.length - 1; i2++) {
        const a2 = this.pts[i2], b2 = this.pts[i2 + 1];
        const mx = (a2.x + b2.x) / 2, my = (a2.y + b2.y) / 2;

      }
    } else {
      for (let i2 = 0; i2 < this.pts.length - 1; i2++) {
        const a2 = this.pts[i2], b2 = this.pts[i2 + 1];
        const mx = (a2.x + b2.x) / 2, my = (a2.y + b2.y) / 2;
        const sg = S("g", {}, g2);
        S("line", { x1: `${a2.x}`, y1: `${a2.y}`, x2: `${b2.x}`, y2: `${b2.y}`, stroke: "#cbd5e1", "stroke-width": "2", "stroke-dasharray": "4,6", "stroke-linecap": "round" }, sg);
        const rl = S("line", { x1: `${a2.x}`, y1: `${a2.y}`, x2: `${b2.x}`, y2: `${b2.y}`, stroke: "#ef4444", "stroke-width": "3", "stroke-linecap": "round", filter: "url(#lGlow)" }, sg);
        rl.style.strokeDasharray = "0";
        rl.style.strokeDashoffset = "0";
        this.segs[i2] = rl;

      }
    }
  }
  /* ===== DOTS + LABELS ===== */
  mkDots(g2) {
    // Render START/FINISH labels at GPX track endpoints (independent of waypoints)
    if (this.hasTrack && this.route.length >= 2) {
      const startPt = this.route[0];
      const endPt = this.route[this.route.length - 1];
      S("text", { x: `${startPt.x - 25}`, y: `${startPt.y - 18}`, "font-size": "10", fill: "#dc2626", "font-weight": "bold", "letter-spacing": "1", class: "hj-noptr" }, g2).textContent = "START";
      S("circle", { cx: `${startPt.x}`, cy: `${startPt.y}`, r: "4", fill: "#dc2626" }, g2);
      S("text", { x: `${endPt.x - 28}`, y: `${endPt.y - 18}`, "font-size": "10", fill: "#dc2626", "font-weight": "bold", "letter-spacing": "1", class: "hj-noptr" }, g2).textContent = "FINISH";
      S("circle", { cx: `${endPt.x}`, cy: `${endPt.y}`, r: "4", fill: "#dc2626" }, g2);
    }
    // Render waypoint dots
    for (let i2 = 0; i2 < this.pts.length; i2++) {
      const p2 = this.pts[i2];
      const dg = S("g", { transform: `translate(${p2.x},${p2.y})`, "data-idx": `${i2}` }, g2);
      const h2 = S("g", { class: "hj-hit" }, dg);
      S("circle", { r: "30", fill: "transparent" }, h2);
      const ping = S("circle", { r: "16", fill: "none", stroke: "#dc2626", "stroke-width": "1.5", class: "hj-ping", opacity: "0" }, h2);
      const dot = S("circle", { r: "4", fill: "#475569", class: "hj-dot" }, h2);
      this.dotRefs[i2] = { dot, ping };
      h2.addEventListener("click", (e2) => {
        e2.stopPropagation();
        this.tapDot(i2);
      });
    }
  }
  /* ===== HEADER ===== */
  mkHeader(el, trip) {
    const h2 = el.createDiv({ cls: "hj-header" });
    h2.createEl("h1", { text: trip.name, cls: "hj-title" });
    const sub = [];
    if (trip.region)
      sub.push(trip.region);
    if (trip.date)
      sub.push(trip.endDate ? `${trip.date} – ${trip.endDate}` : trip.date);
    if (sub.length)
      h2.createEl("p", { text: sub.join(" \xB7 "), cls: "hj-subtitle" });
    h2.createDiv({ cls: "hj-divider" });
    if (trip.stats.distanceKm || trip.stats.elevationGainM) {
      const s2 = h2.createDiv({ cls: "hj-stats" });
      if (trip.stats.distanceKm)
        s2.createEl("span", { text: `\u{1F4CF} ${trip.stats.distanceKm} km` });
      if (trip.stats.elevationGainM)
        s2.createEl("span", { text: `\u2B06\uFE0F ${trip.stats.elevationGainM}m` });
      if (trip.stats.elevationLossM)
        s2.createEl("span", { text: `\u2B07\uFE0F ${trip.stats.elevationLossM}m` });
      s2.createEl("span", { text: `\u{1F4F8} ${trip.waypoints.length} stops` });
    }
    if (trip.description)
      h2.createEl("p", { text: trip.description, cls: "hj-header-desc" });
  }
  /* ===== CARD ===== */
  mkCard(el, p2, i2) {
    const card = el.createDiv({ cls: "hj-card", attr: { "data-i": `${i2}` } });
    const photos = p2.photos && p2.photos.length > 0 ? p2.photos : [];
    const hasImage = photos.length > 0 || !!(p2.imageUrl || p2.vaultPath || p2.filename);
    if (hasImage) {
      const resolveImg = (img, photo) => {
        if (photo.imageUrl)
          img.src = photo.imageUrl;
        else if (photo.vaultPath) {
          const f2 = this.app.vault.getAbstractFileByPath(photo.vaultPath);
          if (f2 instanceof import_obsidian3.TFile)
            img.src = this.app.vault.getResourcePath(f2);
        } else if (photo.filename) {
          const tripFolder = this.mgr.getTripFolder();
          const fpPhotos = (0, import_obsidian3.normalizePath)(`${tripFolder}/photos/${photo.filename}`);
          const fpRoot = (0, import_obsidian3.normalizePath)(`${tripFolder}/${photo.filename}`);
          const f2 = this.app.vault.getAbstractFileByPath(fpPhotos) || this.app.vault.getAbstractFileByPath(fpRoot);
          if (f2 instanceof import_obsidian3.TFile)
            img.src = this.app.vault.getResourcePath(f2);
        }
      };
      // Helper: snap actual image ratio to nearest common ratio and apply to wrapper
      const applyNaturalRatio = (img, wrap) => {
        img.addEventListener("load", () => {
          if (!img.naturalWidth || !img.naturalHeight) return;
          const r = img.naturalWidth / img.naturalHeight;
          const ratios = [[16/9,"16/9"],[3/2,"3/2"],[4/3,"4/3"],[1,"1/1"],[3/4,"3/4"],[2/3,"2/3"],[9/16,"9/16"]];
          let best = ratios[0];
          for (const c of ratios) if (Math.abs(c[0] - r) < Math.abs(best[0] - r)) best = c;
          wrap.style.aspectRatio = best[1];
        });
      };
      // First photo: cone anchor (shadow effect points here)
      const iw = card.createDiv({ cls: "hj-img-wrap hj-cone-anchor" });
      if (photos.length > 0 && photos[0].ar) iw.style.aspectRatio = photos[0].ar;
      const firstImg = iw.createEl("img", { cls: "hj-img hj-img-inactive" });
      if (photos.length > 0) {
        resolveImg(firstImg, photos[0]);
      } else {
        resolveImg(firstImg, p2);
      }
      applyNaturalRatio(firstImg, iw);
      firstImg.alt = p2.title;
      // Extra photos: stacked vertically below
      for (let pi = 1; pi < photos.length; pi++) {
        const extraWrap = card.createDiv({ cls: "hj-img-wrap hj-img-extra" });
        if (photos[pi].ar) extraWrap.style.aspectRatio = photos[pi].ar;
        const extraImg = extraWrap.createEl("img", { cls: "hj-img hj-img-inactive" });
        resolveImg(extraImg, photos[pi]);
        applyNaturalRatio(extraImg, extraWrap);
        extraImg.alt = photos[pi].title || p2.title;
      }
    } else {
      const marker2 = card.createDiv({ cls: "hj-track-marker hj-cone-anchor" });
      const icon = marker2.createDiv({ cls: "hj-track-icon" });
      if (i2 === 0)
        icon.textContent = "\u{1F6A9}";
      else if (i2 === this.pts.length - 1)
        icon.textContent = "\u{1F3C1}";
      else
        icon.textContent = "\u{1F4CD}";
      marker2.createEl("h3", { text: p2.title, cls: "hj-track-title" });
      const coords = marker2.createDiv({ cls: "hj-track-coords" });
      if (p2.lat && p2.lng)
        coords.createEl("span", { text: `${p2.lat.toFixed(4)}\xB0, ${p2.lng.toFixed(4)}\xB0` });
      if (p2.alt != null)
        coords.createEl("span", { text: `${p2.alt}m elev.` });
    }
    // Card info: for V5, hide location labels (sections define structure, not locations)
    if (this.tripVersion >= 5) {
      if (p2.blog?.trim()) {
        const blogDiv = card.createDiv({ cls: "hj-blog" });
        import_obsidian3.MarkdownRenderer.renderMarkdown(p2.blog, blogDiv, "", this);
      }
    } else {
      const info = card.createDiv({ cls: "hj-card-info" });
      const lb = info.createDiv({ cls: "hj-card-label" });
      lb.createDiv({ cls: "hj-dot-sm" });
      lb.createEl("span", { text: p2.title, cls: "hj-card-name" });
      info.createEl("h2", { text: p2.title, cls: "hj-card-title" });
      if (p2.description)
        info.createEl("p", { text: p2.description, cls: "hj-card-desc" });
      const meta = info.createDiv({ cls: "hj-card-meta" });
      if (p2.lat && p2.lng)
        meta.createEl("span", { text: `${p2.lat.toFixed(4)}, ${p2.lng.toFixed(4)}` });
      if (p2.alt != null)
        meta.createEl("span", { text: `${p2.alt}m` });
      if (p2.datetime)
        meta.createEl("span", { text: new Date(p2.datetime).toLocaleString() });
      if (p2.blog?.trim()) {
        const b2 = info.createDiv({ cls: "hj-blog" });
        import_obsidian3.MarkdownRenderer.renderMarkdown(p2.blog, b2, "", this);
      }
    }
    return card;
  }
  /* ====================================================
     ANIMATION LOOP
     ==================================================== */
  _cacheCardCtrs() {
    const vc = this.scrollEl ? this.scrollEl.scrollTop + this.scrollEl.clientHeight / 2 : -1;
    const wasFinish = this.cardCtrs.length > 0 && vc >= this.cardCtrs[this.cardCtrs.length - 1];
    this.cardCtrs = this.cards.map((c2) => c2.offsetTop + c2.offsetHeight / 2);
    // If user was past the last card center, keep them there after card heights change
    if (wasFinish && this.scrollEl && this.cardCtrs.length > 0 && vc < this.cardCtrs[this.cardCtrs.length - 1]) {
      // Use instant scroll (override scroll-behavior: smooth) so the RAF loop sees the correct
      // scrollTop immediately — smooth scroll would cause snap-back on the very next frame
      this.scrollEl.style.scrollBehavior = "auto";
      this.scrollEl.scrollTop = this.cardCtrs[this.cardCtrs.length - 1] - this.scrollEl.clientHeight / 2 + 1;
      this.scrollEl.style.scrollBehavior = "";
    }
  }
  startLoop() {
    const gen = this._loopGen = (this._loopGen || 0) + 1;
    const loop = () => {
      if (gen !== this._loopGen) return; // stale loop from previous rebuild
      if (!this.scrollEl || !this.svgBox) {
        this.raf = requestAnimationFrame(loop);
        return;
      }
      const scrollTop = this.scrollEl.scrollTop;
      const vc = scrollTop + this.scrollEl.clientHeight / 2;
      const ctrs = this.cardCtrs;
      let sp = 0;
      if (ctrs.length) {
        if (vc <= ctrs[0])
          sp = 0;
        else if (vc >= ctrs[ctrs.length - 1]) {
          const lastCtr = ctrs[ctrs.length - 1];
          const scrollEnd = this.scrollEl.scrollHeight - this.scrollEl.clientHeight / 2;
          const extraRange = scrollEnd - lastCtr;
          sp = extraRange > 0
            ? (ctrs.length - 1) + Math.min(1, (vc - lastCtr) / extraRange)
            : ctrs.length - 1;
        } else
          for (let i2 = 0; i2 < ctrs.length - 1; i2++) {
            if (vc >= ctrs[i2] && vc <= ctrs[i2 + 1]) {
              sp = i2 + (vc - ctrs[i2]) / (ctrs[i2 + 1] - ctrs[i2]);
              break;
            }
          }
      }
      // Prevent sp regression when scrollTop hasn't decreased (e.g. cardCtrs updated by ResizeObserver)
      // Only allow sp to decrease if the user actually scrolled up
      if (this._lastScrollTop !== void 0 && this._lastSp !== void 0
          && scrollTop >= this._lastScrollTop - 2 && sp < this._lastSp) {
        sp = this._lastSp;
      }
      this._lastScrollTop = scrollTop;
      this._lastSp = sp;
      const ni = Math.max(0, Math.min(this.pts.length - 1, Math.round(sp)));
      if (ni !== this.ai) {
        const oldAi = this.ai;
        this.ai = ni;
        this.syncCards(oldAi, ni);
        this.syncDots(oldAi, ni);
      }
      const ap = this.pts[this.ai];
      if (!ap) {
        this.raf = requestAnimationFrame(loop);
        return;
      }
      let tipX, tipY;
      let targetDist = 0;
      const fi = Math.min(Math.floor(sp), this.pts.length - 1);
      // When fi is the last waypoint (FINISH zone), fp must be relative to that waypoint index
      // so fp=1 means dot reaches the actual route endpoint (totalDist).
      // Using sp - Math.floor(sp) would reset fp to 0 when sp is an integer (e.g. sp=7), snapping the dot back.
      const fp = fi === this.pts.length - 1 ? Math.min(1, sp - (this.pts.length - 1)) : sp - Math.floor(sp);
      if (this.hasTrack) {
        const d1 = this.pts[fi].trackDist;
        const d2 = fi < this.pts.length - 1 ? this.pts[fi + 1].trackDist : this.totalDist;
        const tipDist = d1 + (d2 - d1) * fp;
        // Route line: first segment fills from START (0), others fill normally
        targetDist = fi === 0 ? fp * d1 : tipDist;
        const tip = interpAt(tipDist, this.route, this.routeDists);
        tipX = tip.x;
        tipY = tip.y;
      } else {
        tipX = this.pts[fi].x;
        tipY = this.pts[fi].y;
        if (fi < this.pts.length - 1) {
          tipX += (this.pts[fi + 1].x - this.pts[fi].x) * fp;
          tipY += (this.pts[fi + 1].y - this.pts[fi].y) * fp;
        }
      }
      const tcx = this.geo.w * CAM_OX - tipX + this.userOffX;
      const tcy = this.geo.h * CAM_OY - tipY + this.userOffY;
      if (!this.userPanning) {
        this.userOffX *= 0.92;
        this.userOffY *= 0.92;
        if (Math.abs(this.userOffX) < 0.5)
          this.userOffX = 0;
        if (Math.abs(this.userOffY) < 0.5)
          this.userOffY = 0;
      }
      // Adaptive lerp: fast catch-up when camera is far behind, smooth when close
      const camDx = tcx - this.cx, camDy = tcy - this.cy;
      const camGap = Math.sqrt(camDx * camDx + camDy * camDy);
      const lerp = camGap > TILE * 3 ? 0.5 : camGap > TILE ? 0.3 : 0.18;
      this.cx += camDx * lerp;
      this.cy += camDy * lerp;
      this.mGrp?.setAttribute("transform", `translate(${this.cx},${this.cy})`);
      // Only sync tiles when camera has moved enough (> 1 tile worth)
      if (Math.abs(this.cx - this._lastTileCx) > TILE / 2 || Math.abs(this.cy - this._lastTileCy) > TILE / 2) {
        this.syncTiles();
        this._lastTileCx = this.cx;
        this._lastTileCy = this.cy;
      }
      this.syncCone(tipX, tipY);
      this.syncLines(sp, targetDist);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  /* ===== DYNAMIC TILE LOADING ===== */
  syncTiles() {
    const sr = this._svgRect || this.svgBox.getBoundingClientRect();
    if (!sr.width || !sr.height)
      return;
    const s = this.userScale || 1;
    const vbW = this.geo.w / s, vbH = this.geo.h / s;
    const vbX = this.geo.w * CAM_OX * (1 - 1 / s);
    const vbY = this.geo.h * CAM_OY * (1 - 1 / s);
    const scale = Math.max(sr.width / vbW, sr.height / vbH);
    const vw = sr.width / scale, vh = sr.height / scale;
    const mapCX = (vbX + vbW / 2) - this.cx;
    const mapCY = (vbY + vbH / 2) - this.cy;
    const buf = 2;
    const xMin = Math.floor(this.geo.minTX + (mapCX - vw / 2) / TILE) - buf;
    const xMax = Math.floor(this.geo.minTX + (mapCX + vw / 2) / TILE) + buf;
    const yMin = Math.floor(this.geo.minTY + (mapCY - vh / 2) / TILE) - buf;
    const yMax = Math.floor(this.geo.minTY + (mapCY + vh / 2) / TILE) + buf;
    const ms = MAP_STYLES[this.mapStyle] || MAP_STYLES["opentopomap"];
    const srv = ms.subs;
    let idx = 0;
    for (let x2 = xMin; x2 <= xMax; x2++) {
      for (let y2 = yMin; y2 <= yMax; y2++) {
        if (idx >= this.tilePool.length)
          break;
        const node = this.tilePool[idx];
        let url = ms.url.replace("{z}", this.geo.zoom).replace("{x}", x2).replace("{y}", y2);
        if (srv.length > 0) url = url.replace("{s}", srv[Math.abs(x2 + y2) % srv.length]);
        if (ms.needsApiKey && STADIA_API_KEY) url += (url.includes("?") ? "&" : "?") + "api_key=" + STADIA_API_KEY;
        if (node.getAttribute("href") !== url) {
          node.setAttribute("href", url);
          node.setAttribute("x", `${(x2 - this.geo.minTX) * TILE}`);
          node.setAttribute("y", `${(y2 - this.geo.minTY) * TILE}`);
        }
        if (node.style.display === "none")
          node.style.display = "";
        idx++;
      }
    }
    while (idx < this.tilePool.length) {
      if (this.tilePool[idx].style.display !== "none")
        this.tilePool[idx].style.display = "none";
      idx++;
    }
  }
  /* ===== CONE SHADOW (multi-photo) ===== */
  syncCone(tipX, tipY) {
    const card = this.cards[this.ai];
    if (!card || !this.coneSvg)
      return;
    // Collect all photo wraps; fallback to track-marker for GPX-only cards
    let wraps = Array.from(card.querySelectorAll(".hj-img-wrap"));
    if (!wraps.length) {
      const marker2 = card.querySelector(".hj-cone-anchor");
      if (marker2)
        wraps = [marker2];
      else
        return;
    }
    const sr = this._svgRect || this.svgBox.getBoundingClientRect();
    if (!sr.width || !sr.height)
      return;
    const zs = this.userScale || 1;
    const vbW = this.geo.w / zs, vbH = this.geo.h / zs;
    const vbX = this.geo.w * CAM_OX * (1 - 1 / zs);
    const vbY = this.geo.h * CAM_OY * (1 - 1 / zs);
    const sc = Math.max(sr.width / vbW, sr.height / vbH);
    if (!sc || !isFinite(sc))
      return;
    const oY = (vbH * sc - sr.height) / 2;
    const oX = (vbW * sc - sr.width) / 2;
    const s2y = (sy) => (sy - sr.top + oY) / sc + vbY;
    const s2x = (sx) => (sx - sr.left + oX) / sc + vbX;
    // Ensure correct number of cone polygons
    while (this.cones.length < wraps.length) {
      const poly = S("polygon", {
        fill: "url(#coneG)",
        style: "mix-blend-mode:multiply;"
      }, this.coneSvg);
      this.cones.push(poly);
    }
    for (let i2 = 0; i2 < this.cones.length; i2++) {
      this.cones[i2].setAttribute("visibility", i2 < wraps.length ? "visible" : "hidden");
    }
    // Tip = map dot position (already smoothed by camera lerp)
    const tx = tipX + this.cx, ty = tipY + this.cy;
    // Cache scrollRect — only changes on resize, not every frame
    if (!this._scrollRect || this._scrollRectAge++ > 30) {
      this._scrollRect = this.scrollEl.getBoundingClientRect();
      this._scrollRectAge = 0;
    }
    const scrollRect = this._scrollRect;
    const scrollH = scrollRect.height;
    for (let i2 = 0; i2 < wraps.length; i2++) {
      const ir = wraps[i2].getBoundingClientRect();
      if (!ir.width || !ir.height)
        continue;
      // t based on scroll position: 0 at viewport bottom → 1 at viewport top
      // Steep ease-out so cone quickly reaches right-top corner
      const photoMid = (ir.top + ir.bottom) / 2;
      const rawT = Math.max(0, Math.min(1, 1 - (photoMid - scrollRect.top) / scrollH));
      const t = 1 - Math.pow(1 - rawT, 4);
      // Top anchor: slides from left-top (t=0) to right-top (t=1) as photo scrolls up
      const p1x = s2x(ir.left + (ir.right - ir.left) * t);
      const p1y = s2y(ir.top);
      // Bottom anchor: always at right-bottom corner
      const p2x = s2x(ir.right);
      const p2y = s2y(ir.bottom);
      if (isFinite(p1x) && isFinite(tx)) {
        this.cones[i2].setAttribute("points",
          `${p1x},${p1y} ${p2x},${p2y} ${tx},${ty}`);
      }
    }
  }
  /* ===== ROUTE PROGRESS ===== */
  syncLines(sp, targetDist) {
    if (this.hasTrack && this.routePathLines && this.routePathLines.length) {
      for (const seg of this.routePathLines) {
        const localDist = Math.max(0, Math.min(seg.segLen, targetDist - seg.startDist));
        seg.line.style.strokeDashoffset = `${seg.segLen - localDist}`;
      }
    } else {
      for (let j2 = 0; j2 < this.pts.length - 1; j2++) {
        const dr = Math.max(0, Math.min(1, sp - j2));
        const len = Math.hypot(this.pts[j2 + 1].x - this.pts[j2].x, this.pts[j2 + 1].y - this.pts[j2].y);
        const l2 = this.segs[j2];
        if (l2) {
          l2.style.strokeDasharray = `${len}`;
          l2.style.strokeDashoffset = `${len * (1 - dr)}`;
        }
      }
    }
    for (let j2 = 0; j2 < this.pts.length - 1; j2++) {
      const passed = this.hasTrack ? targetDist >= (this.pts[j2].trackDist + this.pts[j2 + 1].trackDist) / 2 : Math.max(0, Math.min(1, sp - j2)) >= 0.5;
      if (this.iBgs[j2]) {
        this.iBgs[j2].setAttribute("fill", passed ? "#ef4444" : "#fff");
        this.iBgs[j2].setAttribute("stroke", passed ? "none" : "#cbd5e1");
      }
      if (this.iGs[j2]) {
        this.iGs[j2].classList.toggle("hj-icon-gray", !passed);
        this.iGs[j2].classList.toggle("hj-icon-white", passed);
      }
    }
  }
  /* ===== ACTIVE STATES ===== */
  syncCards(oldIdx, newIdx) {
    const deactivate = (c2) => {
      c2.classList.remove("hj-card-active");
      c2.classList.add("hj-card-dim");
      c2.querySelectorAll(".hj-img").forEach((img) => {
        img.classList.remove("hj-img-active");
        img.classList.add("hj-img-inactive");
      });
      const m2 = c2.querySelector(".hj-track-marker");
      if (m2) { m2.classList.remove("hj-marker-active"); m2.classList.add("hj-marker-dim"); }
    };
    const activate = (c2) => {
      c2.classList.add("hj-card-active");
      c2.classList.remove("hj-card-dim");
      c2.querySelectorAll(".hj-img").forEach((img) => {
        img.classList.add("hj-img-active");
        img.classList.remove("hj-img-inactive");
      });
      const m2 = c2.querySelector(".hj-track-marker");
      if (m2) { m2.classList.add("hj-marker-active"); m2.classList.remove("hj-marker-dim"); }
    };
    if (oldIdx >= 0 && oldIdx < this.cards.length) deactivate(this.cards[oldIdx]);
    if (newIdx >= 0 && newIdx < this.cards.length) activate(this.cards[newIdx]);
  }
  _setDot(ref, active) {
    if (!ref) return;
    if (ref.dot) {
      ref.dot.setAttribute("r", active ? "7" : "4");
      ref.dot.setAttribute("fill", active ? "#dc2626" : "#475569");
      active ? ref.dot.setAttribute("filter", "url(#glow)") : ref.dot.removeAttribute("filter");
    }
    if (ref.ping) {
      ref.ping.setAttribute("opacity", active ? "0.6" : "0");
      ref.ping.classList.toggle("hj-ping-anim", active);
    }
    if (ref.lbl) {
      ref.lbl.setAttribute("font-size", active ? "15" : "12");
      ref.lbl.setAttribute("font-weight", active ? "600" : "500");
      ref.lbl.setAttribute("fill", active ? "#0f172a" : "#64748b");
    }
  }
  syncDots(oldIdx, newIdx) {
    this._setDot(this.dotRefs[oldIdx], false);
    this._setDot(this.dotRefs[newIdx], true);
  }
  /* ===== MAP CLICK ===== */
  tapDot(i2) {
    this.cards[i2]?.scrollIntoView({ behavior: "smooth", block: "center" });
    this.showBubble(i2);
  }
  async showBubble(i2) {
    this.rmBubble();
    const p2 = this.pts[i2];
    if (!p2) return;
    // Use HTML overlay div instead of SVG foreignObject for full CSS/click support
    const wrap3 = this.svgBox.parentElement;
    wrap3.style.position = "relative";
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute;z-index:200;pointer-events:auto;min-width:230px;max-width:290px;";
    const inner = document.createElement("div");
    inner.className = "hj-bubble-inner";
    inner.style.cssText = "position:relative;padding:12px 14px 14px;";
    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "\u00d7";
    closeBtn.style.cssText = "position:absolute;top:6px;right:8px;background:none;border:none;font-size:18px;line-height:1;cursor:pointer;color:#9ca3af;padding:0;";
    closeBtn.addEventListener("click", (e3) => { e3.stopPropagation(); this.rmBubble(); });
    inner.appendChild(closeBtn);
    // Title
    const titleEl = document.createElement("div");
    titleEl.className = "hj-bubble-title";
    titleEl.style.paddingRight = "20px";
    titleEl.textContent = p2.title || "Location";
    inner.appendChild(titleEl);
    // Coordinates
    if (p2.lat && p2.lng) {
      const coords = document.createElement("div");
      coords.style.cssText = "font-size:10px;color:#94a3b8;font-family:monospace;margin-bottom:7px;";
      coords.textContent = `${p2.lat.toFixed(5)}, ${p2.lng.toFixed(5)}`;
      inner.appendChild(coords);
    }
    // Body (AI content)
    const body = document.createElement("div");
    body.style.cssText = "font-size:12px;line-height:1.6;color:#334155;";
    const apiKey = this.settings && this.settings.geminiApiKey;
    if (!apiKey) {
      body.style.color = "#94a3b8";
      body.style.fontStyle = "italic";
      body.textContent = p2.description || "Set Gemini API key in Settings for AI insights.";
    } else {
      body.textContent = "Asking AI\u2026";
    }
    inner.appendChild(body);
    // Caret
    const cr = document.createElement("div");
    cr.className = "hj-bubble-caret";
    inner.appendChild(cr);
    overlay.appendChild(inner);
    // Position: use dot element screen coords (most reliable with any zoom/pan/scale)
    const wrapRect = wrap3.getBoundingClientRect();
    const dotEl = this.dotRefs[i2] && this.dotRefs[i2].dot;
    let left3 = 40, top3 = 40;
    if (dotEl) {
      const dr = dotEl.getBoundingClientRect();
      const dotCx = dr.left + dr.width / 2 - wrapRect.left;
      const dotCy = dr.top + dr.height / 2 - wrapRect.top;
      left3 = Math.max(4, Math.min(dotCx - 115, wrapRect.width - 295));
      top3 = Math.max(4, dotCy - 175);
    }
    overlay.style.left = `${left3}px`;
    overlay.style.top = `${top3}px`;
    wrap3.appendChild(overlay);
    this.bubble = overlay;
    // Stop clicks on bubble from dismissing it via svgBox handler
    overlay.addEventListener("click", (e3) => e3.stopPropagation());
    // Fetch AI info
    if (apiKey && p2.lat && p2.lng) {
      try {
        const model = (this.settings && this.settings.geminiModel) || "gemini-2.0-flash";
        const info = await enrichLocationWithGemini(p2.lat, p2.lng, p2.title || "", apiKey, model);
        if (this.bubble === overlay && info) {
          let html = "";
          if (info.category) html += `<b style="color:#0f172a;">${info.category}</b><br>`;
          if (info.description) html += `<span>${info.description}</span>`;
          if (info.highlights && info.highlights.length) html += `<br><span style="color:#64748b;font-size:10px;">• ${info.highlights.slice(0, 2).join(" \u2022 ")}</span>`;
          body.innerHTML = html || (p2.description || "No information available.");
        }
      } catch (e3) {
        console.error("[HJ] enrichLocationWithGemini failed:", e3);
        if (this.bubble === overlay) {
          body.style.color = "#ef4444";
          body.textContent = e3 && e3.message ? e3.message : "AI error. Check console for details.";
        }
      }
    }
  }
  rmBubble() {
    this.bubble?.remove();
    this.bubble = null;
  }
};

// src/journal-wizard.ts
var import_obsidian4 = require("obsidian");

// node_modules/exifr/dist/full.esm.mjs
var e = "undefined" != typeof self ? self : global;
var t = "undefined" != typeof navigator;
var i = t && "undefined" == typeof HTMLImageElement;
var n = !("undefined" == typeof global || "undefined" == typeof process || !process.versions || !process.versions.node);
var s = e.Buffer;
var r = e.BigInt;
var a = !!s;
var o = (e2) => e2;
function l(e2, t2 = o) {
  if (n)
    try {
      return "function" == typeof require ? Promise.resolve(t2(require(e2))) : import(
        /* webpackIgnore: true */
        e2
      ).then(t2);
    } catch (t3) {
      console.warn(`Couldn't load ${e2}`);
    }
}
var h = e.fetch;
var u = (e2) => h = e2;
if (!e.fetch) {
  const e2 = l("http", (e3) => e3), t2 = l("https", (e3) => e3), i2 = (n2, { headers: s2 } = {}) => new Promise(async (r2, a2) => {
    let { port: o2, hostname: l2, pathname: h2, protocol: u2, search: c2 } = new URL(n2);
    const f2 = { method: "GET", hostname: l2, path: encodeURI(h2) + c2, headers: s2 };
    "" !== o2 && (f2.port = Number(o2));
    const d2 = ("https:" === u2 ? await t2 : await e2).request(f2, (e3) => {
      if (301 === e3.statusCode || 302 === e3.statusCode) {
        let t3 = new URL(e3.headers.location, n2).toString();
        return i2(t3, { headers: s2 }).then(r2).catch(a2);
      }
      r2({ status: e3.statusCode, arrayBuffer: () => new Promise((t3) => {
        let i3 = [];
        e3.on("data", (e4) => i3.push(e4)), e3.on("end", () => t3(Buffer.concat(i3)));
      }) });
    });
    d2.on("error", a2), d2.end();
  });
  u(i2);
}
function c(e2, t2, i2) {
  return t2 in e2 ? Object.defineProperty(e2, t2, { value: i2, enumerable: true, configurable: true, writable: true }) : e2[t2] = i2, e2;
}
var f = (e2) => p(e2) ? void 0 : e2;
var d = (e2) => void 0 !== e2;
function p(e2) {
  return void 0 === e2 || (e2 instanceof Map ? 0 === e2.size : 0 === Object.values(e2).filter(d).length);
}
function g(e2) {
  let t2 = new Error(e2);
  throw delete t2.stack, t2;
}
function m(e2) {
  return "" === (e2 = function(e3) {
    for (; e3.endsWith("\0"); )
      e3 = e3.slice(0, -1);
    return e3;
  }(e2).trim()) ? void 0 : e2;
}
function S2(e2) {
  let t2 = function(e3) {
    let t3 = 0;
    return e3.ifd0.enabled && (t3 += 1024), e3.exif.enabled && (t3 += 2048), e3.makerNote && (t3 += 2048), e3.userComment && (t3 += 1024), e3.gps.enabled && (t3 += 512), e3.interop.enabled && (t3 += 100), e3.ifd1.enabled && (t3 += 1024), t3 + 2048;
  }(e2);
  return e2.jfif.enabled && (t2 += 50), e2.xmp.enabled && (t2 += 2e4), e2.iptc.enabled && (t2 += 14e3), e2.icc.enabled && (t2 += 6e3), t2;
}
var C = (e2) => String.fromCharCode.apply(null, e2);
var y = "undefined" != typeof TextDecoder ? new TextDecoder("utf-8") : void 0;
function b(e2) {
  return y ? y.decode(e2) : a ? Buffer.from(e2).toString("utf8") : decodeURIComponent(escape(C(e2)));
}
var I = class _I {
  static from(e2, t2) {
    return e2 instanceof this && e2.le === t2 ? e2 : new _I(e2, void 0, void 0, t2);
  }
  constructor(e2, t2 = 0, i2, n2) {
    if ("boolean" == typeof n2 && (this.le = n2), Array.isArray(e2) && (e2 = new Uint8Array(e2)), 0 === e2)
      this.byteOffset = 0, this.byteLength = 0;
    else if (e2 instanceof ArrayBuffer) {
      void 0 === i2 && (i2 = e2.byteLength - t2);
      let n3 = new DataView(e2, t2, i2);
      this._swapDataView(n3);
    } else if (e2 instanceof Uint8Array || e2 instanceof DataView || e2 instanceof _I) {
      void 0 === i2 && (i2 = e2.byteLength - t2), (t2 += e2.byteOffset) + i2 > e2.byteOffset + e2.byteLength && g("Creating view outside of available memory in ArrayBuffer");
      let n3 = new DataView(e2.buffer, t2, i2);
      this._swapDataView(n3);
    } else if ("number" == typeof e2) {
      let t3 = new DataView(new ArrayBuffer(e2));
      this._swapDataView(t3);
    } else
      g("Invalid input argument for BufferView: " + e2);
  }
  _swapArrayBuffer(e2) {
    this._swapDataView(new DataView(e2));
  }
  _swapBuffer(e2) {
    this._swapDataView(new DataView(e2.buffer, e2.byteOffset, e2.byteLength));
  }
  _swapDataView(e2) {
    this.dataView = e2, this.buffer = e2.buffer, this.byteOffset = e2.byteOffset, this.byteLength = e2.byteLength;
  }
  _lengthToEnd(e2) {
    return this.byteLength - e2;
  }
  set(e2, t2, i2 = _I) {
    return e2 instanceof DataView || e2 instanceof _I ? e2 = new Uint8Array(e2.buffer, e2.byteOffset, e2.byteLength) : e2 instanceof ArrayBuffer && (e2 = new Uint8Array(e2)), e2 instanceof Uint8Array || g("BufferView.set(): Invalid data argument."), this.toUint8().set(e2, t2), new i2(this, t2, e2.byteLength);
  }
  subarray(e2, t2) {
    return t2 = t2 || this._lengthToEnd(e2), new _I(this, e2, t2);
  }
  toUint8() {
    return new Uint8Array(this.buffer, this.byteOffset, this.byteLength);
  }
  getUint8Array(e2, t2) {
    return new Uint8Array(this.buffer, this.byteOffset + e2, t2);
  }
  getString(e2 = 0, t2 = this.byteLength) {
    return b(this.getUint8Array(e2, t2));
  }
  getLatin1String(e2 = 0, t2 = this.byteLength) {
    let i2 = this.getUint8Array(e2, t2);
    return C(i2);
  }
  getUnicodeString(e2 = 0, t2 = this.byteLength) {
    const i2 = [];
    for (let n2 = 0; n2 < t2 && e2 + n2 < this.byteLength; n2 += 2)
      i2.push(this.getUint16(e2 + n2));
    return C(i2);
  }
  getInt8(e2) {
    return this.dataView.getInt8(e2);
  }
  getUint8(e2) {
    return this.dataView.getUint8(e2);
  }
  getInt16(e2, t2 = this.le) {
    return this.dataView.getInt16(e2, t2);
  }
  getInt32(e2, t2 = this.le) {
    return this.dataView.getInt32(e2, t2);
  }
  getUint16(e2, t2 = this.le) {
    return this.dataView.getUint16(e2, t2);
  }
  getUint32(e2, t2 = this.le) {
    return this.dataView.getUint32(e2, t2);
  }
  getFloat32(e2, t2 = this.le) {
    return this.dataView.getFloat32(e2, t2);
  }
  getFloat64(e2, t2 = this.le) {
    return this.dataView.getFloat64(e2, t2);
  }
  getFloat(e2, t2 = this.le) {
    return this.dataView.getFloat32(e2, t2);
  }
  getDouble(e2, t2 = this.le) {
    return this.dataView.getFloat64(e2, t2);
  }
  getUintBytes(e2, t2, i2) {
    switch (t2) {
      case 1:
        return this.getUint8(e2, i2);
      case 2:
        return this.getUint16(e2, i2);
      case 4:
        return this.getUint32(e2, i2);
      case 8:
        return this.getUint64 && this.getUint64(e2, i2);
    }
  }
  getUint(e2, t2, i2) {
    switch (t2) {
      case 8:
        return this.getUint8(e2, i2);
      case 16:
        return this.getUint16(e2, i2);
      case 32:
        return this.getUint32(e2, i2);
      case 64:
        return this.getUint64 && this.getUint64(e2, i2);
    }
  }
  toString(e2) {
    return this.dataView.toString(e2, this.constructor.name);
  }
  ensureChunk() {
  }
};
function P(e2, t2) {
  g(`${e2} '${t2}' was not loaded, try using full build of exifr.`);
}
var k = class extends Map {
  constructor(e2) {
    super(), this.kind = e2;
  }
  get(e2, t2) {
    return this.has(e2) || P(this.kind, e2), t2 && (e2 in t2 || function(e3, t3) {
      g(`Unknown ${e3} '${t3}'.`);
    }(this.kind, e2), t2[e2].enabled || P(this.kind, e2)), super.get(e2);
  }
  keyList() {
    return Array.from(this.keys());
  }
};
var w = new k("file parser");
var T = new k("segment parser");
var A = new k("file reader");
function D(e2, n2) {
  return "string" == typeof e2 ? O(e2, n2) : t && !i && e2 instanceof HTMLImageElement ? O(e2.src, n2) : e2 instanceof Uint8Array || e2 instanceof ArrayBuffer || e2 instanceof DataView ? new I(e2) : t && e2 instanceof Blob ? x(e2, n2, "blob", R) : void g("Invalid input argument");
}
function O(e2, i2) {
  return (s2 = e2).startsWith("data:") || s2.length > 1e4 ? v(e2, i2, "base64") : n && e2.includes("://") ? x(e2, i2, "url", M) : n ? v(e2, i2, "fs") : t ? x(e2, i2, "url", M) : void g("Invalid input argument");
  var s2;
}
async function x(e2, t2, i2, n2) {
  return A.has(i2) ? v(e2, t2, i2) : n2 ? async function(e3, t3) {
    let i3 = await t3(e3);
    return new I(i3);
  }(e2, n2) : void g(`Parser ${i2} is not loaded`);
}
async function v(e2, t2, i2) {
  let n2 = new (A.get(i2))(e2, t2);
  return await n2.read(), n2;
}
var M = (e2) => h(e2).then((e3) => e3.arrayBuffer());
var R = (e2) => new Promise((t2, i2) => {
  let n2 = new FileReader();
  n2.onloadend = () => t2(n2.result || new ArrayBuffer()), n2.onerror = i2, n2.readAsArrayBuffer(e2);
});
var L3 = class extends Map {
  get tagKeys() {
    return this.allKeys || (this.allKeys = Array.from(this.keys())), this.allKeys;
  }
  get tagValues() {
    return this.allValues || (this.allValues = Array.from(this.values())), this.allValues;
  }
};
function U(e2, t2, i2) {
  let n2 = new L3();
  for (let [e3, t3] of i2)
    n2.set(e3, t3);
  if (Array.isArray(t2))
    for (let i3 of t2)
      e2.set(i3, n2);
  else
    e2.set(t2, n2);
  return n2;
}
function F(e2, t2, i2) {
  let n2, s2 = e2.get(t2);
  for (n2 of i2)
    s2.set(n2[0], n2[1]);
}
var E = /* @__PURE__ */ new Map();
var B = /* @__PURE__ */ new Map();
var N = /* @__PURE__ */ new Map();
var G = ["chunked", "firstChunkSize", "firstChunkSizeNode", "firstChunkSizeBrowser", "chunkSize", "chunkLimit"];
var V = ["jfif", "xmp", "icc", "iptc", "ihdr"];
var z = ["tiff", ...V];
var H = ["ifd0", "ifd1", "exif", "gps", "interop"];
var j = [...z, ...H];
var W = ["makerNote", "userComment"];
var K = ["translateKeys", "translateValues", "reviveValues", "multiSegment"];
var X = [...K, "sanitize", "mergeOutput", "silentErrors"];
var _ = class {
  get translate() {
    return this.translateKeys || this.translateValues || this.reviveValues;
  }
};
var Y = class extends _ {
  get needed() {
    return this.enabled || this.deps.size > 0;
  }
  constructor(e2, t2, i2, n2) {
    if (super(), c(this, "enabled", false), c(this, "skip", /* @__PURE__ */ new Set()), c(this, "pick", /* @__PURE__ */ new Set()), c(this, "deps", /* @__PURE__ */ new Set()), c(this, "translateKeys", false), c(this, "translateValues", false), c(this, "reviveValues", false), this.key = e2, this.enabled = t2, this.parse = this.enabled, this.applyInheritables(n2), this.canBeFiltered = H.includes(e2), this.canBeFiltered && (this.dict = E.get(e2)), void 0 !== i2)
      if (Array.isArray(i2))
        this.parse = this.enabled = true, this.canBeFiltered && i2.length > 0 && this.translateTagSet(i2, this.pick);
      else if ("object" == typeof i2) {
        if (this.enabled = true, this.parse = false !== i2.parse, this.canBeFiltered) {
          let { pick: e3, skip: t3 } = i2;
          e3 && e3.length > 0 && this.translateTagSet(e3, this.pick), t3 && t3.length > 0 && this.translateTagSet(t3, this.skip);
        }
        this.applyInheritables(i2);
      } else
        true === i2 || false === i2 ? this.parse = this.enabled = i2 : g(`Invalid options argument: ${i2}`);
  }
  applyInheritables(e2) {
    let t2, i2;
    for (t2 of K)
      i2 = e2[t2], void 0 !== i2 && (this[t2] = i2);
  }
  translateTagSet(e2, t2) {
    if (this.dict) {
      let i2, n2, { tagKeys: s2, tagValues: r2 } = this.dict;
      for (i2 of e2)
        "string" == typeof i2 ? (n2 = r2.indexOf(i2), -1 === n2 && (n2 = s2.indexOf(Number(i2))), -1 !== n2 && t2.add(Number(s2[n2]))) : t2.add(i2);
    } else
      for (let i2 of e2)
        t2.add(i2);
  }
  finalizeFilters() {
    !this.enabled && this.deps.size > 0 ? (this.enabled = true, ee(this.pick, this.deps)) : this.enabled && this.pick.size > 0 && ee(this.pick, this.deps);
  }
};
var $ = { jfif: false, tiff: true, xmp: false, icc: false, iptc: false, ifd0: true, ifd1: false, exif: true, gps: true, interop: false, ihdr: void 0, makerNote: false, userComment: false, multiSegment: false, skip: [], pick: [], translateKeys: true, translateValues: true, reviveValues: true, sanitize: true, mergeOutput: true, silentErrors: true, chunked: true, firstChunkSize: void 0, firstChunkSizeNode: 512, firstChunkSizeBrowser: 65536, chunkSize: 65536, chunkLimit: 5 };
var J = /* @__PURE__ */ new Map();
var q = class extends _ {
  static useCached(e2) {
    let t2 = J.get(e2);
    return void 0 !== t2 || (t2 = new this(e2), J.set(e2, t2)), t2;
  }
  constructor(e2) {
    super(), true === e2 ? this.setupFromTrue() : void 0 === e2 ? this.setupFromUndefined() : Array.isArray(e2) ? this.setupFromArray(e2) : "object" == typeof e2 ? this.setupFromObject(e2) : g(`Invalid options argument ${e2}`), void 0 === this.firstChunkSize && (this.firstChunkSize = t ? this.firstChunkSizeBrowser : this.firstChunkSizeNode), this.mergeOutput && (this.ifd1.enabled = false), this.filterNestedSegmentTags(), this.traverseTiffDependencyTree(), this.checkLoadedPlugins();
  }
  setupFromUndefined() {
    let e2;
    for (e2 of G)
      this[e2] = $[e2];
    for (e2 of X)
      this[e2] = $[e2];
    for (e2 of W)
      this[e2] = $[e2];
    for (e2 of j)
      this[e2] = new Y(e2, $[e2], void 0, this);
  }
  setupFromTrue() {
    let e2;
    for (e2 of G)
      this[e2] = $[e2];
    for (e2 of X)
      this[e2] = $[e2];
    for (e2 of W)
      this[e2] = true;
    for (e2 of j)
      this[e2] = new Y(e2, true, void 0, this);
  }
  setupFromArray(e2) {
    let t2;
    for (t2 of G)
      this[t2] = $[t2];
    for (t2 of X)
      this[t2] = $[t2];
    for (t2 of W)
      this[t2] = $[t2];
    for (t2 of j)
      this[t2] = new Y(t2, false, void 0, this);
    this.setupGlobalFilters(e2, void 0, H);
  }
  setupFromObject(e2) {
    let t2;
    for (t2 of (H.ifd0 = H.ifd0 || H.image, H.ifd1 = H.ifd1 || H.thumbnail, Object.assign(this, e2), G))
      this[t2] = Z(e2[t2], $[t2]);
    for (t2 of X)
      this[t2] = Z(e2[t2], $[t2]);
    for (t2 of W)
      this[t2] = Z(e2[t2], $[t2]);
    for (t2 of z)
      this[t2] = new Y(t2, $[t2], e2[t2], this);
    for (t2 of H)
      this[t2] = new Y(t2, $[t2], e2[t2], this.tiff);
    this.setupGlobalFilters(e2.pick, e2.skip, H, j), true === e2.tiff ? this.batchEnableWithBool(H, true) : false === e2.tiff ? this.batchEnableWithUserValue(H, e2) : Array.isArray(e2.tiff) ? this.setupGlobalFilters(e2.tiff, void 0, H) : "object" == typeof e2.tiff && this.setupGlobalFilters(e2.tiff.pick, e2.tiff.skip, H);
  }
  batchEnableWithBool(e2, t2) {
    for (let i2 of e2)
      this[i2].enabled = t2;
  }
  batchEnableWithUserValue(e2, t2) {
    for (let i2 of e2) {
      let e3 = t2[i2];
      this[i2].enabled = false !== e3 && void 0 !== e3;
    }
  }
  setupGlobalFilters(e2, t2, i2, n2 = i2) {
    if (e2 && e2.length) {
      for (let e3 of n2)
        this[e3].enabled = false;
      let t3 = Q(e2, i2);
      for (let [e3, i3] of t3)
        ee(this[e3].pick, i3), this[e3].enabled = true;
    } else if (t2 && t2.length) {
      let e3 = Q(t2, i2);
      for (let [t3, i3] of e3)
        ee(this[t3].skip, i3);
    }
  }
  filterNestedSegmentTags() {
    let { ifd0: e2, exif: t2, xmp: i2, iptc: n2, icc: s2 } = this;
    this.makerNote ? t2.deps.add(37500) : t2.skip.add(37500), this.userComment ? t2.deps.add(37510) : t2.skip.add(37510), i2.enabled || e2.skip.add(700), n2.enabled || e2.skip.add(33723), s2.enabled || e2.skip.add(34675);
  }
  traverseTiffDependencyTree() {
    let { ifd0: e2, exif: t2, gps: i2, interop: n2 } = this;
    n2.needed && (t2.deps.add(40965), e2.deps.add(40965)), t2.needed && e2.deps.add(34665), i2.needed && e2.deps.add(34853), this.tiff.enabled = H.some((e3) => true === this[e3].enabled) || this.makerNote || this.userComment;
    for (let e3 of H)
      this[e3].finalizeFilters();
  }
  get onlyTiff() {
    return !V.map((e2) => this[e2].enabled).some((e2) => true === e2) && this.tiff.enabled;
  }
  checkLoadedPlugins() {
    for (let e2 of z)
      this[e2].enabled && !T.has(e2) && P("segment parser", e2);
  }
};
function Q(e2, t2) {
  let i2, n2, s2, r2, a2 = [];
  for (s2 of t2) {
    for (r2 of (i2 = E.get(s2), n2 = [], i2))
      (e2.includes(r2[0]) || e2.includes(r2[1])) && n2.push(r2[0]);
    n2.length && a2.push([s2, n2]);
  }
  return a2;
}
function Z(e2, t2) {
  return void 0 !== e2 ? e2 : void 0 !== t2 ? t2 : void 0;
}
function ee(e2, t2) {
  for (let i2 of t2)
    e2.add(i2);
}
c(q, "default", $);
var te = class {
  constructor(e2) {
    c(this, "parsers", {}), c(this, "output", {}), c(this, "errors", []), c(this, "pushToErrors", (e3) => this.errors.push(e3)), this.options = q.useCached(e2);
  }
  async read(e2) {
    this.file = await D(e2, this.options);
  }
  setup() {
    if (this.fileParser)
      return;
    let { file: e2 } = this, t2 = e2.getUint16(0);
    for (let [i2, n2] of w)
      if (n2.canHandle(e2, t2))
        return this.fileParser = new n2(this.options, this.file, this.parsers), e2[i2] = true;
    this.file.close && this.file.close(), g("Unknown file format");
  }
  async parse() {
    let { output: e2, errors: t2 } = this;
    return this.setup(), this.options.silentErrors ? (await this.executeParsers().catch(this.pushToErrors), t2.push(...this.fileParser.errors)) : await this.executeParsers(), this.file.close && this.file.close(), this.options.silentErrors && t2.length > 0 && (e2.errors = t2), f(e2);
  }
  async executeParsers() {
    let { output: e2 } = this;
    await this.fileParser.parse();
    let t2 = Object.values(this.parsers).map(async (t3) => {
      let i2 = await t3.parse();
      t3.assignToOutput(e2, i2);
    });
    this.options.silentErrors && (t2 = t2.map((e3) => e3.catch(this.pushToErrors))), await Promise.all(t2);
  }
  async extractThumbnail() {
    this.setup();
    let { options: e2, file: t2 } = this, i2 = T.get("tiff", e2);
    var n2;
    if (t2.tiff ? n2 = { start: 0, type: "tiff" } : t2.jpeg && (n2 = await this.fileParser.getOrFindSegment("tiff")), void 0 === n2)
      return;
    let s2 = await this.fileParser.ensureSegmentChunk(n2), r2 = this.parsers.tiff = new i2(s2, e2, t2), a2 = await r2.extractThumbnail();
    return t2.close && t2.close(), a2;
  }
};
async function ie(e2, t2) {
  let i2 = new te(t2);
  return await i2.read(e2), i2.parse();
}
var ne = Object.freeze({ __proto__: null, parse: ie, Exifr: te, fileParsers: w, segmentParsers: T, fileReaders: A, tagKeys: E, tagValues: B, tagRevivers: N, createDictionary: U, extendDictionary: F, fetchUrlAsArrayBuffer: M, readBlobAsArrayBuffer: R, chunkedProps: G, otherSegments: V, segments: z, tiffBlocks: H, segmentsAndBlocks: j, tiffExtractables: W, inheritables: K, allFormatters: X, Options: q });
var se = class {
  constructor(e2, t2, i2) {
    c(this, "errors", []), c(this, "ensureSegmentChunk", async (e3) => {
      let t3 = e3.start, i3 = e3.size || 65536;
      if (this.file.chunked)
        if (this.file.available(t3, i3))
          e3.chunk = this.file.subarray(t3, i3);
        else
          try {
            e3.chunk = await this.file.readChunk(t3, i3);
          } catch (t4) {
            g(`Couldn't read segment: ${JSON.stringify(e3)}. ${t4.message}`);
          }
      else
        this.file.byteLength > t3 + i3 ? e3.chunk = this.file.subarray(t3, i3) : void 0 === e3.size ? e3.chunk = this.file.subarray(t3) : g("Segment unreachable: " + JSON.stringify(e3));
      return e3.chunk;
    }), this.extendOptions && this.extendOptions(e2), this.options = e2, this.file = t2, this.parsers = i2;
  }
  injectSegment(e2, t2) {
    this.options[e2].enabled && this.createParser(e2, t2);
  }
  createParser(e2, t2) {
    let i2 = new (T.get(e2))(t2, this.options, this.file);
    return this.parsers[e2] = i2;
  }
  createParsers(e2) {
    for (let t2 of e2) {
      let { type: e3, chunk: i2 } = t2, n2 = this.options[e3];
      if (n2 && n2.enabled) {
        let t3 = this.parsers[e3];
        t3 && t3.append || t3 || this.createParser(e3, i2);
      }
    }
  }
  async readSegments(e2) {
    let t2 = e2.map(this.ensureSegmentChunk);
    await Promise.all(t2);
  }
};
var re = class {
  static findPosition(e2, t2) {
    let i2 = e2.getUint16(t2 + 2) + 2, n2 = "function" == typeof this.headerLength ? this.headerLength(e2, t2, i2) : this.headerLength, s2 = t2 + n2, r2 = i2 - n2;
    return { offset: t2, length: i2, headerLength: n2, start: s2, size: r2, end: s2 + r2 };
  }
  static parse(e2, t2 = {}) {
    return new this(e2, new q({ [this.type]: t2 }), e2).parse();
  }
  normalizeInput(e2) {
    return e2 instanceof I ? e2 : new I(e2);
  }
  constructor(e2, t2 = {}, i2) {
    c(this, "errors", []), c(this, "raw", /* @__PURE__ */ new Map()), c(this, "handleError", (e3) => {
      if (!this.options.silentErrors)
        throw e3;
      this.errors.push(e3.message);
    }), this.chunk = this.normalizeInput(e2), this.file = i2, this.type = this.constructor.type, this.globalOptions = this.options = t2, this.localOptions = t2[this.type], this.canTranslate = this.localOptions && this.localOptions.translate;
  }
  translate() {
    this.canTranslate && (this.translated = this.translateBlock(this.raw, this.type));
  }
  get output() {
    return this.translated ? this.translated : this.raw ? Object.fromEntries(this.raw) : void 0;
  }
  translateBlock(e2, t2) {
    let i2 = N.get(t2), n2 = B.get(t2), s2 = E.get(t2), r2 = this.options[t2], a2 = r2.reviveValues && !!i2, o2 = r2.translateValues && !!n2, l2 = r2.translateKeys && !!s2, h2 = {};
    for (let [t3, r3] of e2)
      a2 && i2.has(t3) ? r3 = i2.get(t3)(r3) : o2 && n2.has(t3) && (r3 = this.translateValue(r3, n2.get(t3))), l2 && s2.has(t3) && (t3 = s2.get(t3) || t3), h2[t3] = r3;
    return h2;
  }
  translateValue(e2, t2) {
    return t2[e2] || t2.DEFAULT || e2;
  }
  assignToOutput(e2, t2) {
    this.assignObjectToOutput(e2, this.constructor.type, t2);
  }
  assignObjectToOutput(e2, t2, i2) {
    if (this.globalOptions.mergeOutput)
      return Object.assign(e2, i2);
    e2[t2] ? Object.assign(e2[t2], i2) : e2[t2] = i2;
  }
};
c(re, "headerLength", 4), c(re, "type", void 0), c(re, "multiSegment", false), c(re, "canHandle", () => false);
function ae(e2) {
  return 192 === e2 || 194 === e2 || 196 === e2 || 219 === e2 || 221 === e2 || 218 === e2 || 254 === e2;
}
function oe(e2) {
  return e2 >= 224 && e2 <= 239;
}
function le(e2, t2, i2) {
  for (let [n2, s2] of T)
    if (s2.canHandle(e2, t2, i2))
      return n2;
}
var he = class extends se {
  constructor(...e2) {
    super(...e2), c(this, "appSegments", []), c(this, "jpegSegments", []), c(this, "unknownSegments", []);
  }
  static canHandle(e2, t2) {
    return 65496 === t2;
  }
  async parse() {
    await this.findAppSegments(), await this.readSegments(this.appSegments), this.mergeMultiSegments(), this.createParsers(this.mergedAppSegments || this.appSegments);
  }
  setupSegmentFinderArgs(e2) {
    true === e2 ? (this.findAll = true, this.wanted = new Set(T.keyList())) : (e2 = void 0 === e2 ? T.keyList().filter((e3) => this.options[e3].enabled) : e2.filter((e3) => this.options[e3].enabled && T.has(e3)), this.findAll = false, this.remaining = new Set(e2), this.wanted = new Set(e2)), this.unfinishedMultiSegment = false;
  }
  async findAppSegments(e2 = 0, t2) {
    this.setupSegmentFinderArgs(t2);
    let { file: i2, findAll: n2, wanted: s2, remaining: r2 } = this;
    if (!n2 && this.file.chunked && (n2 = Array.from(s2).some((e3) => {
      let t3 = T.get(e3), i3 = this.options[e3];
      return t3.multiSegment && i3.multiSegment;
    }), n2 && await this.file.readWhole()), e2 = this.findAppSegmentsInRange(e2, i2.byteLength), !this.options.onlyTiff && i2.chunked) {
      let t3 = false;
      for (; r2.size > 0 && !t3 && (i2.canReadNextChunk || this.unfinishedMultiSegment); ) {
        let { nextChunkOffset: n3 } = i2, s3 = this.appSegments.some((e3) => !this.file.available(e3.offset || e3.start, e3.length || e3.size));
        if (t3 = e2 > n3 && !s3 ? !await i2.readNextChunk(e2) : !await i2.readNextChunk(n3), void 0 === (e2 = this.findAppSegmentsInRange(e2, i2.byteLength)))
          return;
      }
    }
  }
  findAppSegmentsInRange(e2, t2) {
    t2 -= 2;
    let i2, n2, s2, r2, a2, o2, { file: l2, findAll: h2, wanted: u2, remaining: c2, options: f2 } = this;
    for (; e2 < t2; e2++)
      if (255 === l2.getUint8(e2)) {
        if (i2 = l2.getUint8(e2 + 1), oe(i2)) {
          if (n2 = l2.getUint16(e2 + 2), s2 = le(l2, e2, n2), s2 && u2.has(s2) && (r2 = T.get(s2), a2 = r2.findPosition(l2, e2), o2 = f2[s2], a2.type = s2, this.appSegments.push(a2), !h2 && (r2.multiSegment && o2.multiSegment ? (this.unfinishedMultiSegment = a2.chunkNumber < a2.chunkCount, this.unfinishedMultiSegment || c2.delete(s2)) : c2.delete(s2), 0 === c2.size)))
            break;
          f2.recordUnknownSegments && (a2 = re.findPosition(l2, e2), a2.marker = i2, this.unknownSegments.push(a2)), e2 += n2 + 1;
        } else if (ae(i2)) {
          if (n2 = l2.getUint16(e2 + 2), 218 === i2 && false !== f2.stopAfterSos)
            return;
          f2.recordJpegSegments && this.jpegSegments.push({ offset: e2, length: n2, marker: i2 }), e2 += n2 + 1;
        }
      }
    return e2;
  }
  mergeMultiSegments() {
    if (!this.appSegments.some((e3) => e3.multiSegment))
      return;
    let e2 = function(e3, t2) {
      let i2, n2, s2, r2 = /* @__PURE__ */ new Map();
      for (let a2 = 0; a2 < e3.length; a2++)
        i2 = e3[a2], n2 = i2[t2], r2.has(n2) ? s2 = r2.get(n2) : r2.set(n2, s2 = []), s2.push(i2);
      return Array.from(r2);
    }(this.appSegments, "type");
    this.mergedAppSegments = e2.map(([e3, t2]) => {
      let i2 = T.get(e3, this.options);
      if (i2.handleMultiSegments) {
        return { type: e3, chunk: i2.handleMultiSegments(t2) };
      }
      return t2[0];
    });
  }
  getSegment(e2) {
    return this.appSegments.find((t2) => t2.type === e2);
  }
  async getOrFindSegment(e2) {
    let t2 = this.getSegment(e2);
    return void 0 === t2 && (await this.findAppSegments(0, [e2]), t2 = this.getSegment(e2)), t2;
  }
};
c(he, "type", "jpeg"), w.set("jpeg", he);
var ue = [void 0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8, 4];
var ce = class extends re {
  parseHeader() {
    var e2 = this.chunk.getUint16();
    18761 === e2 ? this.le = true : 19789 === e2 && (this.le = false), this.chunk.le = this.le, this.headerParsed = true;
  }
  parseTags(e2, t2, i2 = /* @__PURE__ */ new Map()) {
    let { pick: n2, skip: s2 } = this.options[t2];
    n2 = new Set(n2);
    let r2 = n2.size > 0, a2 = 0 === s2.size, o2 = this.chunk.getUint16(e2);
    e2 += 2;
    for (let l2 = 0; l2 < o2; l2++) {
      let o3 = this.chunk.getUint16(e2);
      if (r2) {
        if (n2.has(o3) && (i2.set(o3, this.parseTag(e2, o3, t2)), n2.delete(o3), 0 === n2.size))
          break;
      } else
        !a2 && s2.has(o3) || i2.set(o3, this.parseTag(e2, o3, t2));
      e2 += 12;
    }
    return i2;
  }
  parseTag(e2, t2, i2) {
    let { chunk: n2 } = this, s2 = n2.getUint16(e2 + 2), r2 = n2.getUint32(e2 + 4), a2 = ue[s2];
    if (a2 * r2 <= 4 ? e2 += 8 : e2 = n2.getUint32(e2 + 8), (s2 < 1 || s2 > 13) && g(`Invalid TIFF value type. block: ${i2.toUpperCase()}, tag: ${t2.toString(16)}, type: ${s2}, offset ${e2}`), e2 > n2.byteLength && g(`Invalid TIFF value offset. block: ${i2.toUpperCase()}, tag: ${t2.toString(16)}, type: ${s2}, offset ${e2} is outside of chunk size ${n2.byteLength}`), 1 === s2)
      return n2.getUint8Array(e2, r2);
    if (2 === s2)
      return m(n2.getString(e2, r2));
    if (7 === s2)
      return n2.getUint8Array(e2, r2);
    if (1 === r2)
      return this.parseTagValue(s2, e2);
    {
      let t3 = new (function(e3) {
        switch (e3) {
          case 1:
            return Uint8Array;
          case 3:
            return Uint16Array;
          case 4:
            return Uint32Array;
          case 5:
            return Array;
          case 6:
            return Int8Array;
          case 8:
            return Int16Array;
          case 9:
            return Int32Array;
          case 10:
            return Array;
          case 11:
            return Float32Array;
          case 12:
            return Float64Array;
          default:
            return Array;
        }
      }(s2))(r2), i3 = a2;
      for (let n3 = 0; n3 < r2; n3++)
        t3[n3] = this.parseTagValue(s2, e2), e2 += i3;
      return t3;
    }
  }
  parseTagValue(e2, t2) {
    let { chunk: i2 } = this;
    switch (e2) {
      case 1:
        return i2.getUint8(t2);
      case 3:
        return i2.getUint16(t2);
      case 4:
        return i2.getUint32(t2);
      case 5:
        return i2.getUint32(t2) / i2.getUint32(t2 + 4);
      case 6:
        return i2.getInt8(t2);
      case 8:
        return i2.getInt16(t2);
      case 9:
        return i2.getInt32(t2);
      case 10:
        return i2.getInt32(t2) / i2.getInt32(t2 + 4);
      case 11:
        return i2.getFloat(t2);
      case 12:
        return i2.getDouble(t2);
      case 13:
        return i2.getUint32(t2);
      default:
        g(`Invalid tiff type ${e2}`);
    }
  }
};
var fe = class extends ce {
  static canHandle(e2, t2) {
    return 225 === e2.getUint8(t2 + 1) && 1165519206 === e2.getUint32(t2 + 4) && 0 === e2.getUint16(t2 + 8);
  }
  async parse() {
    this.parseHeader();
    let { options: e2 } = this;
    return e2.ifd0.enabled && await this.parseIfd0Block(), e2.exif.enabled && await this.safeParse("parseExifBlock"), e2.gps.enabled && await this.safeParse("parseGpsBlock"), e2.interop.enabled && await this.safeParse("parseInteropBlock"), e2.ifd1.enabled && await this.safeParse("parseThumbnailBlock"), this.createOutput();
  }
  safeParse(e2) {
    let t2 = this[e2]();
    return void 0 !== t2.catch && (t2 = t2.catch(this.handleError)), t2;
  }
  findIfd0Offset() {
    void 0 === this.ifd0Offset && (this.ifd0Offset = this.chunk.getUint32(4));
  }
  findIfd1Offset() {
    if (void 0 === this.ifd1Offset) {
      this.findIfd0Offset();
      let e2 = this.chunk.getUint16(this.ifd0Offset), t2 = this.ifd0Offset + 2 + 12 * e2;
      this.ifd1Offset = this.chunk.getUint32(t2);
    }
  }
  parseBlock(e2, t2) {
    let i2 = /* @__PURE__ */ new Map();
    return this[t2] = i2, this.parseTags(e2, t2, i2), i2;
  }
  async parseIfd0Block() {
    if (this.ifd0)
      return;
    let { file: e2 } = this;
    this.findIfd0Offset(), this.ifd0Offset < 8 && g("Malformed EXIF data"), !e2.chunked && this.ifd0Offset > e2.byteLength && g(`IFD0 offset points to outside of file.
this.ifd0Offset: ${this.ifd0Offset}, file.byteLength: ${e2.byteLength}`), e2.tiff && await e2.ensureChunk(this.ifd0Offset, S2(this.options));
    let t2 = this.parseBlock(this.ifd0Offset, "ifd0");
    return 0 !== t2.size ? (this.exifOffset = t2.get(34665), this.interopOffset = t2.get(40965), this.gpsOffset = t2.get(34853), this.xmp = t2.get(700), this.iptc = t2.get(33723), this.icc = t2.get(34675), this.options.sanitize && (t2.delete(34665), t2.delete(40965), t2.delete(34853), t2.delete(700), t2.delete(33723), t2.delete(34675)), t2) : void 0;
  }
  async parseExifBlock() {
    if (this.exif)
      return;
    if (this.ifd0 || await this.parseIfd0Block(), void 0 === this.exifOffset)
      return;
    this.file.tiff && await this.file.ensureChunk(this.exifOffset, S2(this.options));
    let e2 = this.parseBlock(this.exifOffset, "exif");
    return this.interopOffset || (this.interopOffset = e2.get(40965)), this.makerNote = e2.get(37500), this.userComment = e2.get(37510), this.options.sanitize && (e2.delete(40965), e2.delete(37500), e2.delete(37510)), this.unpack(e2, 41728), this.unpack(e2, 41729), e2;
  }
  unpack(e2, t2) {
    let i2 = e2.get(t2);
    i2 && 1 === i2.length && e2.set(t2, i2[0]);
  }
  async parseGpsBlock() {
    if (this.gps)
      return;
    if (this.ifd0 || await this.parseIfd0Block(), void 0 === this.gpsOffset)
      return;
    let e2 = this.parseBlock(this.gpsOffset, "gps");
    return e2 && e2.has(2) && e2.has(4) && (e2.set("latitude", de(...e2.get(2), e2.get(1))), e2.set("longitude", de(...e2.get(4), e2.get(3)))), e2;
  }
  async parseInteropBlock() {
    if (!this.interop && (this.ifd0 || await this.parseIfd0Block(), void 0 !== this.interopOffset || this.exif || await this.parseExifBlock(), void 0 !== this.interopOffset))
      return this.parseBlock(this.interopOffset, "interop");
  }
  async parseThumbnailBlock(e2 = false) {
    if (!this.ifd1 && !this.ifd1Parsed && (!this.options.mergeOutput || e2))
      return this.findIfd1Offset(), this.ifd1Offset > 0 && (this.parseBlock(this.ifd1Offset, "ifd1"), this.ifd1Parsed = true), this.ifd1;
  }
  async extractThumbnail() {
    if (this.headerParsed || this.parseHeader(), this.ifd1Parsed || await this.parseThumbnailBlock(true), void 0 === this.ifd1)
      return;
    let e2 = this.ifd1.get(513), t2 = this.ifd1.get(514);
    return this.chunk.getUint8Array(e2, t2);
  }
  get image() {
    return this.ifd0;
  }
  get thumbnail() {
    return this.ifd1;
  }
  createOutput() {
    let e2, t2, i2, n2 = {};
    for (t2 of H)
      if (e2 = this[t2], !p(e2))
        if (i2 = this.canTranslate ? this.translateBlock(e2, t2) : Object.fromEntries(e2), this.options.mergeOutput) {
          if ("ifd1" === t2)
            continue;
          Object.assign(n2, i2);
        } else
          n2[t2] = i2;
    return this.makerNote && (n2.makerNote = this.makerNote), this.userComment && (n2.userComment = this.userComment), n2;
  }
  assignToOutput(e2, t2) {
    if (this.globalOptions.mergeOutput)
      Object.assign(e2, t2);
    else
      for (let [i2, n2] of Object.entries(t2))
        this.assignObjectToOutput(e2, i2, n2);
  }
};
function de(e2, t2, i2, n2) {
  var s2 = e2 + t2 / 60 + i2 / 3600;
  return "S" !== n2 && "W" !== n2 || (s2 *= -1), s2;
}
c(fe, "type", "tiff"), c(fe, "headerLength", 10), T.set("tiff", fe);
var pe = Object.freeze({ __proto__: null, default: ne, Exifr: te, fileParsers: w, segmentParsers: T, fileReaders: A, tagKeys: E, tagValues: B, tagRevivers: N, createDictionary: U, extendDictionary: F, fetchUrlAsArrayBuffer: M, readBlobAsArrayBuffer: R, chunkedProps: G, otherSegments: V, segments: z, tiffBlocks: H, segmentsAndBlocks: j, tiffExtractables: W, inheritables: K, allFormatters: X, Options: q, parse: ie });
var ge = { ifd0: false, ifd1: false, exif: false, gps: false, interop: false, sanitize: false, reviveValues: true, translateKeys: false, translateValues: false, mergeOutput: false };
var me = Object.assign({}, ge, { firstChunkSize: 4e4, gps: [1, 2, 3, 4] });
async function Se(e2) {
  let t2 = new te(me);
  await t2.read(e2);
  let i2 = await t2.parse();
  if (i2 && i2.gps) {
    let { latitude: e3, longitude: t3 } = i2.gps;
    return { latitude: e3, longitude: t3 };
  }
}
var Ce = Object.assign({}, ge, { tiff: false, ifd1: true, mergeOutput: false });
async function ye(e2) {
  let t2 = new te(Ce);
  await t2.read(e2);
  let i2 = await t2.extractThumbnail();
  return i2 && a ? s.from(i2) : i2;
}
async function be(e2) {
  let t2 = await this.thumbnail(e2);
  if (void 0 !== t2) {
    let e3 = new Blob([t2]);
    return URL.createObjectURL(e3);
  }
}
var Ie = Object.assign({}, ge, { firstChunkSize: 4e4, ifd0: [274] });
async function Pe(e2) {
  let t2 = new te(Ie);
  await t2.read(e2);
  let i2 = await t2.parse();
  if (i2 && i2.ifd0)
    return i2.ifd0[274];
}
var ke = Object.freeze({ 1: { dimensionSwapped: false, scaleX: 1, scaleY: 1, deg: 0, rad: 0 }, 2: { dimensionSwapped: false, scaleX: -1, scaleY: 1, deg: 0, rad: 0 }, 3: { dimensionSwapped: false, scaleX: 1, scaleY: 1, deg: 180, rad: 180 * Math.PI / 180 }, 4: { dimensionSwapped: false, scaleX: -1, scaleY: 1, deg: 180, rad: 180 * Math.PI / 180 }, 5: { dimensionSwapped: true, scaleX: 1, scaleY: -1, deg: 90, rad: 90 * Math.PI / 180 }, 6: { dimensionSwapped: true, scaleX: 1, scaleY: 1, deg: 90, rad: 90 * Math.PI / 180 }, 7: { dimensionSwapped: true, scaleX: 1, scaleY: -1, deg: 270, rad: 270 * Math.PI / 180 }, 8: { dimensionSwapped: true, scaleX: 1, scaleY: 1, deg: 270, rad: 270 * Math.PI / 180 } });
var we = true;
var Te = true;
if ("object" == typeof navigator) {
  let e2 = navigator.userAgent;
  if (e2.includes("iPad") || e2.includes("iPhone")) {
    let t2 = e2.match(/OS (\d+)_(\d+)/);
    if (t2) {
      let [, e3, i2] = t2, n2 = Number(e3) + 0.1 * Number(i2);
      we = n2 < 13.4, Te = false;
    }
  } else if (e2.includes("OS X 10")) {
    let [, t2] = e2.match(/OS X 10[_.](\d+)/);
    we = Te = Number(t2) < 15;
  }
  if (e2.includes("Chrome/")) {
    let [, t2] = e2.match(/Chrome\/(\d+)/);
    we = Te = Number(t2) < 81;
  } else if (e2.includes("Firefox/")) {
    let [, t2] = e2.match(/Firefox\/(\d+)/);
    we = Te = Number(t2) < 77;
  }
}
async function Ae(e2) {
  let t2 = await Pe(e2);
  return Object.assign({ canvas: we, css: Te }, ke[t2]);
}
var De = class extends I {
  constructor(...e2) {
    super(...e2), c(this, "ranges", new Oe()), 0 !== this.byteLength && this.ranges.add(0, this.byteLength);
  }
  _tryExtend(e2, t2, i2) {
    if (0 === e2 && 0 === this.byteLength && i2) {
      let e3 = new DataView(i2.buffer || i2, i2.byteOffset, i2.byteLength);
      this._swapDataView(e3);
    } else {
      let i3 = e2 + t2;
      if (i3 > this.byteLength) {
        let { dataView: e3 } = this._extend(i3);
        this._swapDataView(e3);
      }
    }
  }
  _extend(e2) {
    let t2;
    t2 = a ? s.allocUnsafe(e2) : new Uint8Array(e2);
    let i2 = new DataView(t2.buffer, t2.byteOffset, t2.byteLength);
    return t2.set(new Uint8Array(this.buffer, this.byteOffset, this.byteLength), 0), { uintView: t2, dataView: i2 };
  }
  subarray(e2, t2, i2 = false) {
    return t2 = t2 || this._lengthToEnd(e2), i2 && this._tryExtend(e2, t2), this.ranges.add(e2, t2), super.subarray(e2, t2);
  }
  set(e2, t2, i2 = false) {
    i2 && this._tryExtend(t2, e2.byteLength, e2);
    let n2 = super.set(e2, t2);
    return this.ranges.add(t2, n2.byteLength), n2;
  }
  async ensureChunk(e2, t2) {
    this.chunked && (this.ranges.available(e2, t2) || await this.readChunk(e2, t2));
  }
  available(e2, t2) {
    return this.ranges.available(e2, t2);
  }
};
var Oe = class {
  constructor() {
    c(this, "list", []);
  }
  get length() {
    return this.list.length;
  }
  add(e2, t2, i2 = 0) {
    let n2 = e2 + t2, s2 = this.list.filter((t3) => xe(e2, t3.offset, n2) || xe(e2, t3.end, n2));
    if (s2.length > 0) {
      e2 = Math.min(e2, ...s2.map((e3) => e3.offset)), n2 = Math.max(n2, ...s2.map((e3) => e3.end)), t2 = n2 - e2;
      let i3 = s2.shift();
      i3.offset = e2, i3.length = t2, i3.end = n2, this.list = this.list.filter((e3) => !s2.includes(e3));
    } else
      this.list.push({ offset: e2, length: t2, end: n2 });
  }
  available(e2, t2) {
    let i2 = e2 + t2;
    return this.list.some((t3) => t3.offset <= e2 && i2 <= t3.end);
  }
};
function xe(e2, t2, i2) {
  return e2 <= t2 && t2 <= i2;
}
var ve = class extends De {
  constructor(e2, t2) {
    super(0), c(this, "chunksRead", 0), this.input = e2, this.options = t2;
  }
  async readWhole() {
    this.chunked = false, await this.readChunk(this.nextChunkOffset);
  }
  async readChunked() {
    this.chunked = true, await this.readChunk(0, this.options.firstChunkSize);
  }
  async readNextChunk(e2 = this.nextChunkOffset) {
    if (this.fullyRead)
      return this.chunksRead++, false;
    let t2 = this.options.chunkSize, i2 = await this.readChunk(e2, t2);
    return !!i2 && i2.byteLength === t2;
  }
  async readChunk(e2, t2) {
    if (this.chunksRead++, 0 !== (t2 = this.safeWrapAddress(e2, t2)))
      return this._readChunk(e2, t2);
  }
  safeWrapAddress(e2, t2) {
    return void 0 !== this.size && e2 + t2 > this.size ? Math.max(0, this.size - e2) : t2;
  }
  get nextChunkOffset() {
    if (0 !== this.ranges.list.length)
      return this.ranges.list[0].length;
  }
  get canReadNextChunk() {
    return this.chunksRead < this.options.chunkLimit;
  }
  get fullyRead() {
    return void 0 !== this.size && this.nextChunkOffset === this.size;
  }
  read() {
    return this.options.chunked ? this.readChunked() : this.readWhole();
  }
  close() {
  }
};
A.set("blob", class extends ve {
  async readWhole() {
    this.chunked = false;
    let e2 = await R(this.input);
    this._swapArrayBuffer(e2);
  }
  readChunked() {
    return this.chunked = true, this.size = this.input.size, super.readChunked();
  }
  async _readChunk(e2, t2) {
    let i2 = t2 ? e2 + t2 : void 0, n2 = this.input.slice(e2, i2), s2 = await R(n2);
    return this.set(s2, e2, true);
  }
});
var Me = Object.freeze({ __proto__: null, default: pe, Exifr: te, fileParsers: w, segmentParsers: T, fileReaders: A, tagKeys: E, tagValues: B, tagRevivers: N, createDictionary: U, extendDictionary: F, fetchUrlAsArrayBuffer: M, readBlobAsArrayBuffer: R, chunkedProps: G, otherSegments: V, segments: z, tiffBlocks: H, segmentsAndBlocks: j, tiffExtractables: W, inheritables: K, allFormatters: X, Options: q, parse: ie, gpsOnlyOptions: me, gps: Se, thumbnailOnlyOptions: Ce, thumbnail: ye, thumbnailUrl: be, orientationOnlyOptions: Ie, orientation: Pe, rotations: ke, get rotateCanvas() {
  return we;
}, get rotateCss() {
  return Te;
}, rotation: Ae });
A.set("url", class extends ve {
  async readWhole() {
    this.chunked = false;
    let e2 = await M(this.input);
    e2 instanceof ArrayBuffer ? this._swapArrayBuffer(e2) : e2 instanceof Uint8Array && this._swapBuffer(e2);
  }
  async _readChunk(e2, t2) {
    let i2 = t2 ? e2 + t2 - 1 : void 0, n2 = this.options.httpHeaders || {};
    (e2 || i2) && (n2.range = `bytes=${[e2, i2].join("-")}`);
    let s2 = await h(this.input, { headers: n2 }), r2 = await s2.arrayBuffer(), a2 = r2.byteLength;
    if (416 !== s2.status)
      return a2 !== t2 && (this.size = e2 + a2), this.set(r2, e2, true);
  }
});
I.prototype.getUint64 = function(e2) {
  let t2 = this.getUint32(e2), i2 = this.getUint32(e2 + 4);
  return t2 < 1048575 ? t2 << 32 | i2 : void 0 !== typeof r ? (console.warn("Using BigInt because of type 64uint but JS can only handle 53b numbers."), r(t2) << r(32) | r(i2)) : void g("Trying to read 64b value but JS can only handle 53b numbers.");
};
var Re = class extends se {
  parseBoxes(e2 = 0) {
    let t2 = [];
    for (; e2 < this.file.byteLength - 4; ) {
      let i2 = this.parseBoxHead(e2);
      if (t2.push(i2), 0 === i2.length)
        break;
      e2 += i2.length;
    }
    return t2;
  }
  parseSubBoxes(e2) {
    e2.boxes = this.parseBoxes(e2.start);
  }
  findBox(e2, t2) {
    return void 0 === e2.boxes && this.parseSubBoxes(e2), e2.boxes.find((e3) => e3.kind === t2);
  }
  parseBoxHead(e2) {
    let t2 = this.file.getUint32(e2), i2 = this.file.getString(e2 + 4, 4), n2 = e2 + 8;
    return 1 === t2 && (t2 = this.file.getUint64(e2 + 8), n2 += 8), { offset: e2, length: t2, kind: i2, start: n2 };
  }
  parseBoxFullHead(e2) {
    if (void 0 !== e2.version)
      return;
    let t2 = this.file.getUint32(e2.start);
    e2.version = t2 >> 24, e2.start += 4;
  }
};
var Le = class extends Re {
  static canHandle(e2, t2) {
    if (0 !== t2)
      return false;
    let i2 = e2.getUint16(2);
    if (i2 > 50)
      return false;
    let n2 = 16, s2 = [];
    for (; n2 < i2; )
      s2.push(e2.getString(n2, 4)), n2 += 4;
    return s2.includes(this.type);
  }
  async parse() {
    let e2 = this.file.getUint32(0), t2 = this.parseBoxHead(e2);
    for (; "meta" !== t2.kind; )
      e2 += t2.length, await this.file.ensureChunk(e2, 16), t2 = this.parseBoxHead(e2);
    await this.file.ensureChunk(t2.offset, t2.length), this.parseBoxFullHead(t2), this.parseSubBoxes(t2), this.options.icc.enabled && await this.findIcc(t2), this.options.tiff.enabled && await this.findExif(t2);
  }
  async registerSegment(e2, t2, i2) {
    await this.file.ensureChunk(t2, i2);
    let n2 = this.file.subarray(t2, i2);
    this.createParser(e2, n2);
  }
  async findIcc(e2) {
    let t2 = this.findBox(e2, "iprp");
    if (void 0 === t2)
      return;
    let i2 = this.findBox(t2, "ipco");
    if (void 0 === i2)
      return;
    let n2 = this.findBox(i2, "colr");
    void 0 !== n2 && await this.registerSegment("icc", n2.offset + 12, n2.length);
  }
  async findExif(e2) {
    let t2 = this.findBox(e2, "iinf");
    if (void 0 === t2)
      return;
    let i2 = this.findBox(e2, "iloc");
    if (void 0 === i2)
      return;
    let n2 = this.findExifLocIdInIinf(t2), s2 = this.findExtentInIloc(i2, n2);
    if (void 0 === s2)
      return;
    let [r2, a2] = s2;
    await this.file.ensureChunk(r2, a2);
    let o2 = 4 + this.file.getUint32(r2);
    r2 += o2, a2 -= o2, await this.registerSegment("tiff", r2, a2);
  }
  findExifLocIdInIinf(e2) {
    this.parseBoxFullHead(e2);
    let t2, i2, n2, s2, r2 = e2.start, a2 = this.file.getUint16(r2);
    for (r2 += 2; a2--; ) {
      if (t2 = this.parseBoxHead(r2), this.parseBoxFullHead(t2), i2 = t2.start, t2.version >= 2 && (n2 = 3 === t2.version ? 4 : 2, s2 = this.file.getString(i2 + n2 + 2, 4), "Exif" === s2))
        return this.file.getUintBytes(i2, n2);
      r2 += t2.length;
    }
  }
  get8bits(e2) {
    let t2 = this.file.getUint8(e2);
    return [t2 >> 4, 15 & t2];
  }
  findExtentInIloc(e2, t2) {
    this.parseBoxFullHead(e2);
    let i2 = e2.start, [n2, s2] = this.get8bits(i2++), [r2, a2] = this.get8bits(i2++), o2 = 2 === e2.version ? 4 : 2, l2 = 1 === e2.version || 2 === e2.version ? 2 : 0, h2 = a2 + n2 + s2, u2 = 2 === e2.version ? 4 : 2, c2 = this.file.getUintBytes(i2, u2);
    for (i2 += u2; c2--; ) {
      let e3 = this.file.getUintBytes(i2, o2);
      i2 += o2 + l2 + 2 + r2;
      let u3 = this.file.getUint16(i2);
      if (i2 += 2, e3 === t2)
        return u3 > 1 && console.warn("ILOC box has more than one extent but we're only processing one\nPlease create an issue at https://github.com/MikeKovarik/exifr with this file"), [this.file.getUintBytes(i2 + a2, n2), this.file.getUintBytes(i2 + a2 + n2, s2)];
      i2 += u3 * h2;
    }
  }
};
var Ue = class extends Le {
};
c(Ue, "type", "heic");
var Fe = class extends Le {
};
c(Fe, "type", "avif"), w.set("heic", Ue), w.set("avif", Fe), U(E, ["ifd0", "ifd1"], [[256, "ImageWidth"], [257, "ImageHeight"], [258, "BitsPerSample"], [259, "Compression"], [262, "PhotometricInterpretation"], [270, "ImageDescription"], [271, "Make"], [272, "Model"], [273, "StripOffsets"], [274, "Orientation"], [277, "SamplesPerPixel"], [278, "RowsPerStrip"], [279, "StripByteCounts"], [282, "XResolution"], [283, "YResolution"], [284, "PlanarConfiguration"], [296, "ResolutionUnit"], [301, "TransferFunction"], [305, "Software"], [306, "ModifyDate"], [315, "Artist"], [316, "HostComputer"], [317, "Predictor"], [318, "WhitePoint"], [319, "PrimaryChromaticities"], [513, "ThumbnailOffset"], [514, "ThumbnailLength"], [529, "YCbCrCoefficients"], [530, "YCbCrSubSampling"], [531, "YCbCrPositioning"], [532, "ReferenceBlackWhite"], [700, "ApplicationNotes"], [33432, "Copyright"], [33723, "IPTC"], [34665, "ExifIFD"], [34675, "ICC"], [34853, "GpsIFD"], [330, "SubIFD"], [40965, "InteropIFD"], [40091, "XPTitle"], [40092, "XPComment"], [40093, "XPAuthor"], [40094, "XPKeywords"], [40095, "XPSubject"]]), U(E, "exif", [[33434, "ExposureTime"], [33437, "FNumber"], [34850, "ExposureProgram"], [34852, "SpectralSensitivity"], [34855, "ISO"], [34858, "TimeZoneOffset"], [34859, "SelfTimerMode"], [34864, "SensitivityType"], [34865, "StandardOutputSensitivity"], [34866, "RecommendedExposureIndex"], [34867, "ISOSpeed"], [34868, "ISOSpeedLatitudeyyy"], [34869, "ISOSpeedLatitudezzz"], [36864, "ExifVersion"], [36867, "DateTimeOriginal"], [36868, "CreateDate"], [36873, "GooglePlusUploadCode"], [36880, "OffsetTime"], [36881, "OffsetTimeOriginal"], [36882, "OffsetTimeDigitized"], [37121, "ComponentsConfiguration"], [37122, "CompressedBitsPerPixel"], [37377, "ShutterSpeedValue"], [37378, "ApertureValue"], [37379, "BrightnessValue"], [37380, "ExposureCompensation"], [37381, "MaxApertureValue"], [37382, "SubjectDistance"], [37383, "MeteringMode"], [37384, "LightSource"], [37385, "Flash"], [37386, "FocalLength"], [37393, "ImageNumber"], [37394, "SecurityClassification"], [37395, "ImageHistory"], [37396, "SubjectArea"], [37500, "MakerNote"], [37510, "UserComment"], [37520, "SubSecTime"], [37521, "SubSecTimeOriginal"], [37522, "SubSecTimeDigitized"], [37888, "AmbientTemperature"], [37889, "Humidity"], [37890, "Pressure"], [37891, "WaterDepth"], [37892, "Acceleration"], [37893, "CameraElevationAngle"], [40960, "FlashpixVersion"], [40961, "ColorSpace"], [40962, "ExifImageWidth"], [40963, "ExifImageHeight"], [40964, "RelatedSoundFile"], [41483, "FlashEnergy"], [41486, "FocalPlaneXResolution"], [41487, "FocalPlaneYResolution"], [41488, "FocalPlaneResolutionUnit"], [41492, "SubjectLocation"], [41493, "ExposureIndex"], [41495, "SensingMethod"], [41728, "FileSource"], [41729, "SceneType"], [41730, "CFAPattern"], [41985, "CustomRendered"], [41986, "ExposureMode"], [41987, "WhiteBalance"], [41988, "DigitalZoomRatio"], [41989, "FocalLengthIn35mmFormat"], [41990, "SceneCaptureType"], [41991, "GainControl"], [41992, "Contrast"], [41993, "Saturation"], [41994, "Sharpness"], [41996, "SubjectDistanceRange"], [42016, "ImageUniqueID"], [42032, "OwnerName"], [42033, "SerialNumber"], [42034, "LensInfo"], [42035, "LensMake"], [42036, "LensModel"], [42037, "LensSerialNumber"], [42080, "CompositeImage"], [42081, "CompositeImageCount"], [42082, "CompositeImageExposureTimes"], [42240, "Gamma"], [59932, "Padding"], [59933, "OffsetSchema"], [65e3, "OwnerName"], [65001, "SerialNumber"], [65002, "Lens"], [65100, "RawFile"], [65101, "Converter"], [65102, "WhiteBalance"], [65105, "Exposure"], [65106, "Shadows"], [65107, "Brightness"], [65108, "Contrast"], [65109, "Saturation"], [65110, "Sharpness"], [65111, "Smoothness"], [65112, "MoireFilter"], [40965, "InteropIFD"]]), U(E, "gps", [[0, "GPSVersionID"], [1, "GPSLatitudeRef"], [2, "GPSLatitude"], [3, "GPSLongitudeRef"], [4, "GPSLongitude"], [5, "GPSAltitudeRef"], [6, "GPSAltitude"], [7, "GPSTimeStamp"], [8, "GPSSatellites"], [9, "GPSStatus"], [10, "GPSMeasureMode"], [11, "GPSDOP"], [12, "GPSSpeedRef"], [13, "GPSSpeed"], [14, "GPSTrackRef"], [15, "GPSTrack"], [16, "GPSImgDirectionRef"], [17, "GPSImgDirection"], [18, "GPSMapDatum"], [19, "GPSDestLatitudeRef"], [20, "GPSDestLatitude"], [21, "GPSDestLongitudeRef"], [22, "GPSDestLongitude"], [23, "GPSDestBearingRef"], [24, "GPSDestBearing"], [25, "GPSDestDistanceRef"], [26, "GPSDestDistance"], [27, "GPSProcessingMethod"], [28, "GPSAreaInformation"], [29, "GPSDateStamp"], [30, "GPSDifferential"], [31, "GPSHPositioningError"]]), U(B, ["ifd0", "ifd1"], [[274, { 1: "Horizontal (normal)", 2: "Mirror horizontal", 3: "Rotate 180", 4: "Mirror vertical", 5: "Mirror horizontal and rotate 270 CW", 6: "Rotate 90 CW", 7: "Mirror horizontal and rotate 90 CW", 8: "Rotate 270 CW" }], [296, { 1: "None", 2: "inches", 3: "cm" }]]);
var Ee = U(B, "exif", [[34850, { 0: "Not defined", 1: "Manual", 2: "Normal program", 3: "Aperture priority", 4: "Shutter priority", 5: "Creative program", 6: "Action program", 7: "Portrait mode", 8: "Landscape mode" }], [37121, { 0: "-", 1: "Y", 2: "Cb", 3: "Cr", 4: "R", 5: "G", 6: "B" }], [37383, { 0: "Unknown", 1: "Average", 2: "CenterWeightedAverage", 3: "Spot", 4: "MultiSpot", 5: "Pattern", 6: "Partial", 255: "Other" }], [37384, { 0: "Unknown", 1: "Daylight", 2: "Fluorescent", 3: "Tungsten (incandescent light)", 4: "Flash", 9: "Fine weather", 10: "Cloudy weather", 11: "Shade", 12: "Daylight fluorescent (D 5700 - 7100K)", 13: "Day white fluorescent (N 4600 - 5400K)", 14: "Cool white fluorescent (W 3900 - 4500K)", 15: "White fluorescent (WW 3200 - 3700K)", 17: "Standard light A", 18: "Standard light B", 19: "Standard light C", 20: "D55", 21: "D65", 22: "D75", 23: "D50", 24: "ISO studio tungsten", 255: "Other" }], [37385, { 0: "Flash did not fire", 1: "Flash fired", 5: "Strobe return light not detected", 7: "Strobe return light detected", 9: "Flash fired, compulsory flash mode", 13: "Flash fired, compulsory flash mode, return light not detected", 15: "Flash fired, compulsory flash mode, return light detected", 16: "Flash did not fire, compulsory flash mode", 24: "Flash did not fire, auto mode", 25: "Flash fired, auto mode", 29: "Flash fired, auto mode, return light not detected", 31: "Flash fired, auto mode, return light detected", 32: "No flash function", 65: "Flash fired, red-eye reduction mode", 69: "Flash fired, red-eye reduction mode, return light not detected", 71: "Flash fired, red-eye reduction mode, return light detected", 73: "Flash fired, compulsory flash mode, red-eye reduction mode", 77: "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected", 79: "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected", 89: "Flash fired, auto mode, red-eye reduction mode", 93: "Flash fired, auto mode, return light not detected, red-eye reduction mode", 95: "Flash fired, auto mode, return light detected, red-eye reduction mode" }], [41495, { 1: "Not defined", 2: "One-chip color area sensor", 3: "Two-chip color area sensor", 4: "Three-chip color area sensor", 5: "Color sequential area sensor", 7: "Trilinear sensor", 8: "Color sequential linear sensor" }], [41728, { 1: "Film Scanner", 2: "Reflection Print Scanner", 3: "Digital Camera" }], [41729, { 1: "Directly photographed" }], [41985, { 0: "Normal", 1: "Custom", 2: "HDR (no original saved)", 3: "HDR (original saved)", 4: "Original (for HDR)", 6: "Panorama", 7: "Portrait HDR", 8: "Portrait" }], [41986, { 0: "Auto", 1: "Manual", 2: "Auto bracket" }], [41987, { 0: "Auto", 1: "Manual" }], [41990, { 0: "Standard", 1: "Landscape", 2: "Portrait", 3: "Night", 4: "Other" }], [41991, { 0: "None", 1: "Low gain up", 2: "High gain up", 3: "Low gain down", 4: "High gain down" }], [41996, { 0: "Unknown", 1: "Macro", 2: "Close", 3: "Distant" }], [42080, { 0: "Unknown", 1: "Not a Composite Image", 2: "General Composite Image", 3: "Composite Image Captured While Shooting" }]]);
var Be = { 1: "No absolute unit of measurement", 2: "Inch", 3: "Centimeter" };
Ee.set(37392, Be), Ee.set(41488, Be);
var Ne = { 0: "Normal", 1: "Low", 2: "High" };
function Ge(e2) {
  return "object" == typeof e2 && void 0 !== e2.length ? e2[0] : e2;
}
function Ve(e2) {
  let t2 = Array.from(e2).slice(1);
  return t2[1] > 15 && (t2 = t2.map((e3) => String.fromCharCode(e3))), "0" !== t2[2] && 0 !== t2[2] || t2.pop(), t2.join(".");
}
function ze(e2) {
  if ("string" == typeof e2) {
    var [t2, i2, n2, s2, r2, a2] = e2.trim().split(/[-: ]/g).map(Number), o2 = new Date(t2, i2 - 1, n2);
    return Number.isNaN(s2) || Number.isNaN(r2) || Number.isNaN(a2) || (o2.setHours(s2), o2.setMinutes(r2), o2.setSeconds(a2)), Number.isNaN(+o2) ? e2 : o2;
  }
}
function He(e2) {
  if ("string" == typeof e2)
    return e2;
  let t2 = [];
  if (0 === e2[1] && 0 === e2[e2.length - 1])
    for (let i2 = 0; i2 < e2.length; i2 += 2)
      t2.push(je(e2[i2 + 1], e2[i2]));
  else
    for (let i2 = 0; i2 < e2.length; i2 += 2)
      t2.push(je(e2[i2], e2[i2 + 1]));
  return m(String.fromCodePoint(...t2));
}
function je(e2, t2) {
  return e2 << 8 | t2;
}
Ee.set(41992, Ne), Ee.set(41993, Ne), Ee.set(41994, Ne), U(N, ["ifd0", "ifd1"], [[50827, function(e2) {
  return "string" != typeof e2 ? b(e2) : e2;
}], [306, ze], [40091, He], [40092, He], [40093, He], [40094, He], [40095, He]]), U(N, "exif", [[40960, Ve], [36864, Ve], [36867, ze], [36868, ze], [40962, Ge], [40963, Ge]]), U(N, "gps", [[0, (e2) => Array.from(e2).join(".")], [7, (e2) => Array.from(e2).join(":")]]);
var We = class extends re {
  static canHandle(e2, t2) {
    return 225 === e2.getUint8(t2 + 1) && 1752462448 === e2.getUint32(t2 + 4) && "http://ns.adobe.com/" === e2.getString(t2 + 4, "http://ns.adobe.com/".length);
  }
  static headerLength(e2, t2) {
    return "http://ns.adobe.com/xmp/extension/" === e2.getString(t2 + 4, "http://ns.adobe.com/xmp/extension/".length) ? 79 : 4 + "http://ns.adobe.com/xap/1.0/".length + 1;
  }
  static findPosition(e2, t2) {
    let i2 = super.findPosition(e2, t2);
    return i2.multiSegment = i2.extended = 79 === i2.headerLength, i2.multiSegment ? (i2.chunkCount = e2.getUint8(t2 + 72), i2.chunkNumber = e2.getUint8(t2 + 76), 0 !== e2.getUint8(t2 + 77) && i2.chunkNumber++) : (i2.chunkCount = 1 / 0, i2.chunkNumber = -1), i2;
  }
  static handleMultiSegments(e2) {
    return e2.map((e3) => e3.chunk.getString()).join("");
  }
  normalizeInput(e2) {
    return "string" == typeof e2 ? e2 : I.from(e2).getString();
  }
  parse(e2 = this.chunk) {
    if (!this.localOptions.parse)
      return e2;
    e2 = function(e3) {
      let t3 = {}, i3 = {};
      for (let e4 of Ze)
        t3[e4] = [], i3[e4] = 0;
      return e3.replace(et, (e4, n3, s2) => {
        if ("<" === n3) {
          let n4 = ++i3[s2];
          return t3[s2].push(n4), `${e4}#${n4}`;
        }
        return `${e4}#${t3[s2].pop()}`;
      });
    }(e2);
    let t2 = Xe.findAll(e2, "rdf", "Description");
    0 === t2.length && t2.push(new Xe("rdf", "Description", void 0, e2));
    let i2, n2 = {};
    for (let e3 of t2)
      for (let t3 of e3.properties)
        i2 = Je(t3.ns, n2), _e(t3, i2);
    return function(e3) {
      let t3;
      for (let i3 in e3)
        t3 = e3[i3] = f(e3[i3]), void 0 === t3 && delete e3[i3];
      return f(e3);
    }(n2);
  }
  assignToOutput(e2, t2) {
    if (this.localOptions.parse)
      for (let [i2, n2] of Object.entries(t2))
        switch (i2) {
          case "tiff":
            this.assignObjectToOutput(e2, "ifd0", n2);
            break;
          case "exif":
            this.assignObjectToOutput(e2, "exif", n2);
            break;
          case "xmlns":
            break;
          default:
            this.assignObjectToOutput(e2, i2, n2);
        }
    else
      e2.xmp = t2;
  }
};
c(We, "type", "xmp"), c(We, "multiSegment", true), T.set("xmp", We);
var Ke = class _Ke {
  static findAll(e2) {
    return qe(e2, /([a-zA-Z0-9-]+):([a-zA-Z0-9-]+)=("[^"]*"|'[^']*')/gm).map(_Ke.unpackMatch);
  }
  static unpackMatch(e2) {
    let t2 = e2[1], i2 = e2[2], n2 = e2[3].slice(1, -1);
    return n2 = Qe(n2), new _Ke(t2, i2, n2);
  }
  constructor(e2, t2, i2) {
    this.ns = e2, this.name = t2, this.value = i2;
  }
  serialize() {
    return this.value;
  }
};
var Xe = class _Xe {
  static findAll(e2, t2, i2) {
    if (void 0 !== t2 || void 0 !== i2) {
      t2 = t2 || "[\\w\\d-]+", i2 = i2 || "[\\w\\d-]+";
      var n2 = new RegExp(`<(${t2}):(${i2})(#\\d+)?((\\s+?[\\w\\d-:]+=("[^"]*"|'[^']*'))*\\s*)(\\/>|>([\\s\\S]*?)<\\/\\1:\\2\\3>)`, "gm");
    } else
      n2 = /<([\w\d-]+):([\w\d-]+)(#\d+)?((\s+?[\w\d-:]+=("[^"]*"|'[^']*'))*\s*)(\/>|>([\s\S]*?)<\/\1:\2\3>)/gm;
    return qe(e2, n2).map(_Xe.unpackMatch);
  }
  static unpackMatch(e2) {
    let t2 = e2[1], i2 = e2[2], n2 = e2[4], s2 = e2[8];
    return new _Xe(t2, i2, n2, s2);
  }
  constructor(e2, t2, i2, n2) {
    this.ns = e2, this.name = t2, this.attrString = i2, this.innerXml = n2, this.attrs = Ke.findAll(i2), this.children = _Xe.findAll(n2), this.value = 0 === this.children.length ? Qe(n2) : void 0, this.properties = [...this.attrs, ...this.children];
  }
  get isPrimitive() {
    return void 0 !== this.value && 0 === this.attrs.length && 0 === this.children.length;
  }
  get isListContainer() {
    return 1 === this.children.length && this.children[0].isList;
  }
  get isList() {
    let { ns: e2, name: t2 } = this;
    return "rdf" === e2 && ("Seq" === t2 || "Bag" === t2 || "Alt" === t2);
  }
  get isListItem() {
    return "rdf" === this.ns && "li" === this.name;
  }
  serialize() {
    if (0 === this.properties.length && void 0 === this.value)
      return;
    if (this.isPrimitive)
      return this.value;
    if (this.isListContainer)
      return this.children[0].serialize();
    if (this.isList)
      return $e(this.children.map(Ye));
    if (this.isListItem && 1 === this.children.length && 0 === this.attrs.length)
      return this.children[0].serialize();
    let e2 = {};
    for (let t2 of this.properties)
      _e(t2, e2);
    return void 0 !== this.value && (e2.value = this.value), f(e2);
  }
};
function _e(e2, t2) {
  let i2 = e2.serialize();
  void 0 !== i2 && (t2[e2.name] = i2);
}
var Ye = (e2) => e2.serialize();
var $e = (e2) => 1 === e2.length ? e2[0] : e2;
var Je = (e2, t2) => t2[e2] ? t2[e2] : t2[e2] = {};
function qe(e2, t2) {
  let i2, n2 = [];
  if (!e2)
    return n2;
  for (; null !== (i2 = t2.exec(e2)); )
    n2.push(i2);
  return n2;
}
function Qe(e2) {
  if (function(e3) {
    return null == e3 || "null" === e3 || "undefined" === e3 || "" === e3 || "" === e3.trim();
  }(e2))
    return;
  let t2 = Number(e2);
  if (!Number.isNaN(t2))
    return t2;
  let i2 = e2.toLowerCase();
  return "true" === i2 || "false" !== i2 && e2.trim();
}
var Ze = ["rdf:li", "rdf:Seq", "rdf:Bag", "rdf:Alt", "rdf:Description"];
var et = new RegExp(`(<|\\/)(${Ze.join("|")})`, "g");
var tt = Object.freeze({ __proto__: null, default: Me, Exifr: te, fileParsers: w, segmentParsers: T, fileReaders: A, tagKeys: E, tagValues: B, tagRevivers: N, createDictionary: U, extendDictionary: F, fetchUrlAsArrayBuffer: M, readBlobAsArrayBuffer: R, chunkedProps: G, otherSegments: V, segments: z, tiffBlocks: H, segmentsAndBlocks: j, tiffExtractables: W, inheritables: K, allFormatters: X, Options: q, parse: ie, gpsOnlyOptions: me, gps: Se, thumbnailOnlyOptions: Ce, thumbnail: ye, thumbnailUrl: be, orientationOnlyOptions: Ie, orientation: Pe, rotations: ke, get rotateCanvas() {
  return we;
}, get rotateCss() {
  return Te;
}, rotation: Ae });
var at = l("fs", (e2) => e2.promises);
A.set("fs", class extends ve {
  async readWhole() {
    this.chunked = false, this.fs = await at;
    let e2 = await this.fs.readFile(this.input);
    this._swapBuffer(e2);
  }
  async readChunked() {
    this.chunked = true, this.fs = await at, await this.open(), await this.readChunk(0, this.options.firstChunkSize);
  }
  async open() {
    void 0 === this.fh && (this.fh = await this.fs.open(this.input, "r"), this.size = (await this.fh.stat(this.input)).size);
  }
  async _readChunk(e2, t2) {
    void 0 === this.fh && await this.open(), e2 + t2 > this.size && (t2 = this.size - e2);
    var i2 = this.subarray(e2, t2, true);
    return await this.fh.read(i2.dataView, 0, t2, e2), i2;
  }
  async close() {
    if (this.fh) {
      let e2 = this.fh;
      this.fh = void 0, await e2.close();
    }
  }
});
A.set("base64", class extends ve {
  constructor(...e2) {
    super(...e2), this.input = this.input.replace(/^data:([^;]+);base64,/gim, ""), this.size = this.input.length / 4 * 3, this.input.endsWith("==") ? this.size -= 2 : this.input.endsWith("=") && (this.size -= 1);
  }
  async _readChunk(e2, t2) {
    let i2, n2, r2 = this.input;
    void 0 === e2 ? (e2 = 0, i2 = 0, n2 = 0) : (i2 = 4 * Math.floor(e2 / 3), n2 = e2 - i2 / 4 * 3), void 0 === t2 && (t2 = this.size);
    let o2 = e2 + t2, l2 = i2 + 4 * Math.ceil(o2 / 3);
    r2 = r2.slice(i2, l2);
    let h2 = Math.min(t2, this.size - e2);
    if (a) {
      let t3 = s.from(r2, "base64").slice(n2, n2 + h2);
      return this.set(t3, e2, true);
    }
    {
      let t3 = this.subarray(e2, h2, true), i3 = atob(r2), s2 = t3.toUint8();
      for (let e3 = 0; e3 < h2; e3++)
        s2[e3] = i3.charCodeAt(n2 + e3);
      return t3;
    }
  }
});
var ot = class extends se {
  static canHandle(e2, t2) {
    return 18761 === t2 || 19789 === t2;
  }
  extendOptions(e2) {
    let { ifd0: t2, xmp: i2, iptc: n2, icc: s2 } = e2;
    i2.enabled && t2.deps.add(700), n2.enabled && t2.deps.add(33723), s2.enabled && t2.deps.add(34675), t2.finalizeFilters();
  }
  async parse() {
    let { tiff: e2, xmp: t2, iptc: i2, icc: n2 } = this.options;
    if (e2.enabled || t2.enabled || i2.enabled || n2.enabled) {
      let e3 = Math.max(S2(this.options), this.options.chunkSize);
      await this.file.ensureChunk(0, e3), this.createParser("tiff", this.file), this.parsers.tiff.parseHeader(), await this.parsers.tiff.parseIfd0Block(), this.adaptTiffPropAsSegment("xmp"), this.adaptTiffPropAsSegment("iptc"), this.adaptTiffPropAsSegment("icc");
    }
  }
  adaptTiffPropAsSegment(e2) {
    if (this.parsers.tiff[e2]) {
      let t2 = this.parsers.tiff[e2];
      this.injectSegment(e2, t2);
    }
  }
};
c(ot, "type", "tiff"), w.set("tiff", ot);
var lt = l("zlib");
var ht = ["ihdr", "iccp", "text", "itxt", "exif"];
var ut = class extends se {
  constructor(...e2) {
    super(...e2), c(this, "catchError", (e3) => this.errors.push(e3)), c(this, "metaChunks", []), c(this, "unknownChunks", []);
  }
  static canHandle(e2, t2) {
    return 35152 === t2 && 2303741511 === e2.getUint32(0) && 218765834 === e2.getUint32(4);
  }
  async parse() {
    let { file: e2 } = this;
    await this.findPngChunksInRange("\x89PNG\r\n\n".length, e2.byteLength), await this.readSegments(this.metaChunks), this.findIhdr(), this.parseTextChunks(), await this.findExif().catch(this.catchError), await this.findXmp().catch(this.catchError), await this.findIcc().catch(this.catchError);
  }
  async findPngChunksInRange(e2, t2) {
    let { file: i2 } = this;
    for (; e2 < t2; ) {
      let t3 = i2.getUint32(e2), n2 = i2.getUint32(e2 + 4), s2 = i2.getString(e2 + 4, 4).toLowerCase(), r2 = t3 + 4 + 4 + 4, a2 = { type: s2, offset: e2, length: r2, start: e2 + 4 + 4, size: t3, marker: n2 };
      ht.includes(s2) ? this.metaChunks.push(a2) : this.unknownChunks.push(a2), e2 += r2;
    }
  }
  parseTextChunks() {
    let e2 = this.metaChunks.filter((e3) => "text" === e3.type);
    for (let t2 of e2) {
      let [e3, i2] = this.file.getString(t2.start, t2.size).split("\0");
      this.injectKeyValToIhdr(e3, i2);
    }
  }
  injectKeyValToIhdr(e2, t2) {
    let i2 = this.parsers.ihdr;
    i2 && i2.raw.set(e2, t2);
  }
  findIhdr() {
    let e2 = this.metaChunks.find((e3) => "ihdr" === e3.type);
    e2 && false !== this.options.ihdr.enabled && this.createParser("ihdr", e2.chunk);
  }
  async findExif() {
    let e2 = this.metaChunks.find((e3) => "exif" === e3.type);
    e2 && this.injectSegment("tiff", e2.chunk);
  }
  async findXmp() {
    let e2 = this.metaChunks.filter((e3) => "itxt" === e3.type);
    for (let t2 of e2) {
      "XML:com.adobe.xmp" === t2.chunk.getString(0, "XML:com.adobe.xmp".length) && this.injectSegment("xmp", t2.chunk);
    }
  }
  async findIcc() {
    let e2 = this.metaChunks.find((e3) => "iccp" === e3.type);
    if (!e2)
      return;
    let { chunk: t2 } = e2, i2 = t2.getUint8Array(0, 81), s2 = 0;
    for (; s2 < 80 && 0 !== i2[s2]; )
      s2++;
    let r2 = s2 + 2, a2 = t2.getString(0, s2);
    if (this.injectKeyValToIhdr("ProfileName", a2), n) {
      let e3 = await lt, i3 = t2.getUint8Array(r2);
      i3 = e3.inflateSync(i3), this.injectSegment("icc", i3);
    }
  }
};
c(ut, "type", "png"), w.set("png", ut), U(E, "interop", [[1, "InteropIndex"], [2, "InteropVersion"], [4096, "RelatedImageFileFormat"], [4097, "RelatedImageWidth"], [4098, "RelatedImageHeight"]]), F(E, "ifd0", [[11, "ProcessingSoftware"], [254, "SubfileType"], [255, "OldSubfileType"], [263, "Thresholding"], [264, "CellWidth"], [265, "CellLength"], [266, "FillOrder"], [269, "DocumentName"], [280, "MinSampleValue"], [281, "MaxSampleValue"], [285, "PageName"], [286, "XPosition"], [287, "YPosition"], [290, "GrayResponseUnit"], [297, "PageNumber"], [321, "HalftoneHints"], [322, "TileWidth"], [323, "TileLength"], [332, "InkSet"], [337, "TargetPrinter"], [18246, "Rating"], [18249, "RatingPercent"], [33550, "PixelScale"], [34264, "ModelTransform"], [34377, "PhotoshopSettings"], [50706, "DNGVersion"], [50707, "DNGBackwardVersion"], [50708, "UniqueCameraModel"], [50709, "LocalizedCameraModel"], [50736, "DNGLensInfo"], [50739, "ShadowScale"], [50740, "DNGPrivateData"], [33920, "IntergraphMatrix"], [33922, "ModelTiePoint"], [34118, "SEMInfo"], [34735, "GeoTiffDirectory"], [34736, "GeoTiffDoubleParams"], [34737, "GeoTiffAsciiParams"], [50341, "PrintIM"], [50721, "ColorMatrix1"], [50722, "ColorMatrix2"], [50723, "CameraCalibration1"], [50724, "CameraCalibration2"], [50725, "ReductionMatrix1"], [50726, "ReductionMatrix2"], [50727, "AnalogBalance"], [50728, "AsShotNeutral"], [50729, "AsShotWhiteXY"], [50730, "BaselineExposure"], [50731, "BaselineNoise"], [50732, "BaselineSharpness"], [50734, "LinearResponseLimit"], [50735, "CameraSerialNumber"], [50741, "MakerNoteSafety"], [50778, "CalibrationIlluminant1"], [50779, "CalibrationIlluminant2"], [50781, "RawDataUniqueID"], [50827, "OriginalRawFileName"], [50828, "OriginalRawFileData"], [50831, "AsShotICCProfile"], [50832, "AsShotPreProfileMatrix"], [50833, "CurrentICCProfile"], [50834, "CurrentPreProfileMatrix"], [50879, "ColorimetricReference"], [50885, "SRawType"], [50898, "PanasonicTitle"], [50899, "PanasonicTitle2"], [50931, "CameraCalibrationSig"], [50932, "ProfileCalibrationSig"], [50933, "ProfileIFD"], [50934, "AsShotProfileName"], [50936, "ProfileName"], [50937, "ProfileHueSatMapDims"], [50938, "ProfileHueSatMapData1"], [50939, "ProfileHueSatMapData2"], [50940, "ProfileToneCurve"], [50941, "ProfileEmbedPolicy"], [50942, "ProfileCopyright"], [50964, "ForwardMatrix1"], [50965, "ForwardMatrix2"], [50966, "PreviewApplicationName"], [50967, "PreviewApplicationVersion"], [50968, "PreviewSettingsName"], [50969, "PreviewSettingsDigest"], [50970, "PreviewColorSpace"], [50971, "PreviewDateTime"], [50972, "RawImageDigest"], [50973, "OriginalRawFileDigest"], [50981, "ProfileLookTableDims"], [50982, "ProfileLookTableData"], [51043, "TimeCodes"], [51044, "FrameRate"], [51058, "TStop"], [51081, "ReelName"], [51089, "OriginalDefaultFinalSize"], [51090, "OriginalBestQualitySize"], [51091, "OriginalDefaultCropSize"], [51105, "CameraLabel"], [51107, "ProfileHueSatMapEncoding"], [51108, "ProfileLookTableEncoding"], [51109, "BaselineExposureOffset"], [51110, "DefaultBlackRender"], [51111, "NewRawImageDigest"], [51112, "RawToPreviewGain"]]);
var ct = [[273, "StripOffsets"], [279, "StripByteCounts"], [288, "FreeOffsets"], [289, "FreeByteCounts"], [291, "GrayResponseCurve"], [292, "T4Options"], [293, "T6Options"], [300, "ColorResponseUnit"], [320, "ColorMap"], [324, "TileOffsets"], [325, "TileByteCounts"], [326, "BadFaxLines"], [327, "CleanFaxData"], [328, "ConsecutiveBadFaxLines"], [330, "SubIFD"], [333, "InkNames"], [334, "NumberofInks"], [336, "DotRange"], [338, "ExtraSamples"], [339, "SampleFormat"], [340, "SMinSampleValue"], [341, "SMaxSampleValue"], [342, "TransferRange"], [343, "ClipPath"], [344, "XClipPathUnits"], [345, "YClipPathUnits"], [346, "Indexed"], [347, "JPEGTables"], [351, "OPIProxy"], [400, "GlobalParametersIFD"], [401, "ProfileType"], [402, "FaxProfile"], [403, "CodingMethods"], [404, "VersionYear"], [405, "ModeNumber"], [433, "Decode"], [434, "DefaultImageColor"], [435, "T82Options"], [437, "JPEGTables"], [512, "JPEGProc"], [515, "JPEGRestartInterval"], [517, "JPEGLosslessPredictors"], [518, "JPEGPointTransforms"], [519, "JPEGQTables"], [520, "JPEGDCTables"], [521, "JPEGACTables"], [559, "StripRowCounts"], [999, "USPTOMiscellaneous"], [18247, "XP_DIP_XML"], [18248, "StitchInfo"], [28672, "SonyRawFileType"], [28688, "SonyToneCurve"], [28721, "VignettingCorrection"], [28722, "VignettingCorrParams"], [28724, "ChromaticAberrationCorrection"], [28725, "ChromaticAberrationCorrParams"], [28726, "DistortionCorrection"], [28727, "DistortionCorrParams"], [29895, "SonyCropTopLeft"], [29896, "SonyCropSize"], [32781, "ImageID"], [32931, "WangTag1"], [32932, "WangAnnotation"], [32933, "WangTag3"], [32934, "WangTag4"], [32953, "ImageReferencePoints"], [32954, "RegionXformTackPoint"], [32955, "WarpQuadrilateral"], [32956, "AffineTransformMat"], [32995, "Matteing"], [32996, "DataType"], [32997, "ImageDepth"], [32998, "TileDepth"], [33300, "ImageFullWidth"], [33301, "ImageFullHeight"], [33302, "TextureFormat"], [33303, "WrapModes"], [33304, "FovCot"], [33305, "MatrixWorldToScreen"], [33306, "MatrixWorldToCamera"], [33405, "Model2"], [33421, "CFARepeatPatternDim"], [33422, "CFAPattern2"], [33423, "BatteryLevel"], [33424, "KodakIFD"], [33445, "MDFileTag"], [33446, "MDScalePixel"], [33447, "MDColorTable"], [33448, "MDLabName"], [33449, "MDSampleInfo"], [33450, "MDPrepDate"], [33451, "MDPrepTime"], [33452, "MDFileUnits"], [33589, "AdventScale"], [33590, "AdventRevision"], [33628, "UIC1Tag"], [33629, "UIC2Tag"], [33630, "UIC3Tag"], [33631, "UIC4Tag"], [33918, "IntergraphPacketData"], [33919, "IntergraphFlagRegisters"], [33921, "INGRReserved"], [34016, "Site"], [34017, "ColorSequence"], [34018, "IT8Header"], [34019, "RasterPadding"], [34020, "BitsPerRunLength"], [34021, "BitsPerExtendedRunLength"], [34022, "ColorTable"], [34023, "ImageColorIndicator"], [34024, "BackgroundColorIndicator"], [34025, "ImageColorValue"], [34026, "BackgroundColorValue"], [34027, "PixelIntensityRange"], [34028, "TransparencyIndicator"], [34029, "ColorCharacterization"], [34030, "HCUsage"], [34031, "TrapIndicator"], [34032, "CMYKEquivalent"], [34152, "AFCP_IPTC"], [34232, "PixelMagicJBIGOptions"], [34263, "JPLCartoIFD"], [34306, "WB_GRGBLevels"], [34310, "LeafData"], [34687, "TIFF_FXExtensions"], [34688, "MultiProfiles"], [34689, "SharedData"], [34690, "T88Options"], [34732, "ImageLayer"], [34750, "JBIGOptions"], [34856, "Opto-ElectricConvFactor"], [34857, "Interlace"], [34908, "FaxRecvParams"], [34909, "FaxSubAddress"], [34910, "FaxRecvTime"], [34929, "FedexEDR"], [34954, "LeafSubIFD"], [37387, "FlashEnergy"], [37388, "SpatialFrequencyResponse"], [37389, "Noise"], [37390, "FocalPlaneXResolution"], [37391, "FocalPlaneYResolution"], [37392, "FocalPlaneResolutionUnit"], [37397, "ExposureIndex"], [37398, "TIFF-EPStandardID"], [37399, "SensingMethod"], [37434, "CIP3DataFile"], [37435, "CIP3Sheet"], [37436, "CIP3Side"], [37439, "StoNits"], [37679, "MSDocumentText"], [37680, "MSPropertySetStorage"], [37681, "MSDocumentTextPosition"], [37724, "ImageSourceData"], [40965, "InteropIFD"], [40976, "SamsungRawPointersOffset"], [40977, "SamsungRawPointersLength"], [41217, "SamsungRawByteOrder"], [41218, "SamsungRawUnknown"], [41484, "SpatialFrequencyResponse"], [41485, "Noise"], [41489, "ImageNumber"], [41490, "SecurityClassification"], [41491, "ImageHistory"], [41494, "TIFF-EPStandardID"], [41995, "DeviceSettingDescription"], [42112, "GDALMetadata"], [42113, "GDALNoData"], [44992, "ExpandSoftware"], [44993, "ExpandLens"], [44994, "ExpandFilm"], [44995, "ExpandFilterLens"], [44996, "ExpandScanner"], [44997, "ExpandFlashLamp"], [46275, "HasselbladRawImage"], [48129, "PixelFormat"], [48130, "Transformation"], [48131, "Uncompressed"], [48132, "ImageType"], [48256, "ImageWidth"], [48257, "ImageHeight"], [48258, "WidthResolution"], [48259, "HeightResolution"], [48320, "ImageOffset"], [48321, "ImageByteCount"], [48322, "AlphaOffset"], [48323, "AlphaByteCount"], [48324, "ImageDataDiscard"], [48325, "AlphaDataDiscard"], [50215, "OceScanjobDesc"], [50216, "OceApplicationSelector"], [50217, "OceIDNumber"], [50218, "OceImageLogic"], [50255, "Annotations"], [50459, "HasselbladExif"], [50547, "OriginalFileName"], [50560, "USPTOOriginalContentType"], [50656, "CR2CFAPattern"], [50710, "CFAPlaneColor"], [50711, "CFALayout"], [50712, "LinearizationTable"], [50713, "BlackLevelRepeatDim"], [50714, "BlackLevel"], [50715, "BlackLevelDeltaH"], [50716, "BlackLevelDeltaV"], [50717, "WhiteLevel"], [50718, "DefaultScale"], [50719, "DefaultCropOrigin"], [50720, "DefaultCropSize"], [50733, "BayerGreenSplit"], [50737, "ChromaBlurRadius"], [50738, "AntiAliasStrength"], [50752, "RawImageSegmentation"], [50780, "BestQualityScale"], [50784, "AliasLayerMetadata"], [50829, "ActiveArea"], [50830, "MaskedAreas"], [50935, "NoiseReductionApplied"], [50974, "SubTileBlockSize"], [50975, "RowInterleaveFactor"], [51008, "OpcodeList1"], [51009, "OpcodeList2"], [51022, "OpcodeList3"], [51041, "NoiseProfile"], [51114, "CacheVersion"], [51125, "DefaultUserCrop"], [51157, "NikonNEFInfo"], [65024, "KdcIFD"]];
F(E, "ifd0", ct), F(E, "exif", ct), U(B, "gps", [[23, { M: "Magnetic North", T: "True North" }], [25, { K: "Kilometers", M: "Miles", N: "Nautical Miles" }]]);
var ft = class extends re {
  static canHandle(e2, t2) {
    return 224 === e2.getUint8(t2 + 1) && 1246120262 === e2.getUint32(t2 + 4) && 0 === e2.getUint8(t2 + 8);
  }
  parse() {
    return this.parseTags(), this.translate(), this.output;
  }
  parseTags() {
    this.raw = /* @__PURE__ */ new Map([[0, this.chunk.getUint16(0)], [2, this.chunk.getUint8(2)], [3, this.chunk.getUint16(3)], [5, this.chunk.getUint16(5)], [7, this.chunk.getUint8(7)], [8, this.chunk.getUint8(8)]]);
  }
};
c(ft, "type", "jfif"), c(ft, "headerLength", 9), T.set("jfif", ft), U(E, "jfif", [[0, "JFIFVersion"], [2, "ResolutionUnit"], [3, "XResolution"], [5, "YResolution"], [7, "ThumbnailWidth"], [8, "ThumbnailHeight"]]);
var dt = class extends re {
  parse() {
    return this.parseTags(), this.translate(), this.output;
  }
  parseTags() {
    this.raw = new Map([[0, this.chunk.getUint32(0)], [4, this.chunk.getUint32(4)], [8, this.chunk.getUint8(8)], [9, this.chunk.getUint8(9)], [10, this.chunk.getUint8(10)], [11, this.chunk.getUint8(11)], [12, this.chunk.getUint8(12)], ...Array.from(this.raw)]);
  }
};
c(dt, "type", "ihdr"), T.set("ihdr", dt), U(E, "ihdr", [[0, "ImageWidth"], [4, "ImageHeight"], [8, "BitDepth"], [9, "ColorType"], [10, "Compression"], [11, "Filter"], [12, "Interlace"]]), U(B, "ihdr", [[9, { 0: "Grayscale", 2: "RGB", 3: "Palette", 4: "Grayscale with Alpha", 6: "RGB with Alpha", DEFAULT: "Unknown" }], [10, { 0: "Deflate/Inflate", DEFAULT: "Unknown" }], [11, { 0: "Adaptive", DEFAULT: "Unknown" }], [12, { 0: "Noninterlaced", 1: "Adam7 Interlace", DEFAULT: "Unknown" }]]);
var pt = class extends re {
  static canHandle(e2, t2) {
    return 226 === e2.getUint8(t2 + 1) && 1229144927 === e2.getUint32(t2 + 4);
  }
  static findPosition(e2, t2) {
    let i2 = super.findPosition(e2, t2);
    return i2.chunkNumber = e2.getUint8(t2 + 16), i2.chunkCount = e2.getUint8(t2 + 17), i2.multiSegment = i2.chunkCount > 1, i2;
  }
  static handleMultiSegments(e2) {
    return function(e3) {
      let t2 = function(e4) {
        let t3 = e4[0].constructor, i2 = 0;
        for (let t4 of e4)
          i2 += t4.length;
        let n2 = new t3(i2), s2 = 0;
        for (let t4 of e4)
          n2.set(t4, s2), s2 += t4.length;
        return n2;
      }(e3.map((e4) => e4.chunk.toUint8()));
      return new I(t2);
    }(e2);
  }
  parse() {
    return this.raw = /* @__PURE__ */ new Map(), this.parseHeader(), this.parseTags(), this.translate(), this.output;
  }
  parseHeader() {
    let { raw: e2 } = this;
    this.chunk.byteLength < 84 && g("ICC header is too short");
    for (let [t2, i2] of Object.entries(gt)) {
      t2 = parseInt(t2, 10);
      let n2 = i2(this.chunk, t2);
      "\0\0\0\0" !== n2 && e2.set(t2, n2);
    }
  }
  parseTags() {
    let e2, t2, i2, n2, s2, { raw: r2 } = this, a2 = this.chunk.getUint32(128), o2 = 132, l2 = this.chunk.byteLength;
    for (; a2--; ) {
      if (e2 = this.chunk.getString(o2, 4), t2 = this.chunk.getUint32(o2 + 4), i2 = this.chunk.getUint32(o2 + 8), n2 = this.chunk.getString(t2, 4), t2 + i2 > l2)
        return void console.warn("reached the end of the first ICC chunk. Enable options.tiff.multiSegment to read all ICC segments.");
      s2 = this.parseTag(n2, t2, i2), void 0 !== s2 && "\0\0\0\0" !== s2 && r2.set(e2, s2), o2 += 12;
    }
  }
  parseTag(e2, t2, i2) {
    switch (e2) {
      case "desc":
        return this.parseDesc(t2);
      case "mluc":
        return this.parseMluc(t2);
      case "text":
        return this.parseText(t2, i2);
      case "sig ":
        return this.parseSig(t2);
    }
    if (!(t2 + i2 > this.chunk.byteLength))
      return this.chunk.getUint8Array(t2, i2);
  }
  parseDesc(e2) {
    let t2 = this.chunk.getUint32(e2 + 8) - 1;
    return m(this.chunk.getString(e2 + 12, t2));
  }
  parseText(e2, t2) {
    return m(this.chunk.getString(e2 + 8, t2 - 8));
  }
  parseSig(e2) {
    return m(this.chunk.getString(e2 + 8, 4));
  }
  parseMluc(e2) {
    let { chunk: t2 } = this, i2 = t2.getUint32(e2 + 8), n2 = t2.getUint32(e2 + 12), s2 = e2 + 16, r2 = [];
    for (let a2 = 0; a2 < i2; a2++) {
      let i3 = t2.getString(s2 + 0, 2), a3 = t2.getString(s2 + 2, 2), o2 = t2.getUint32(s2 + 4), l2 = t2.getUint32(s2 + 8) + e2, h2 = m(t2.getUnicodeString(l2, o2));
      r2.push({ lang: i3, country: a3, text: h2 }), s2 += n2;
    }
    return 1 === i2 ? r2[0].text : r2;
  }
  translateValue(e2, t2) {
    return "string" == typeof e2 ? t2[e2] || t2[e2.toLowerCase()] || e2 : t2[e2] || e2;
  }
};
c(pt, "type", "icc"), c(pt, "multiSegment", true), c(pt, "headerLength", 18);
var gt = { 4: mt, 8: function(e2, t2) {
  return [e2.getUint8(t2), e2.getUint8(t2 + 1) >> 4, e2.getUint8(t2 + 1) % 16].map((e3) => e3.toString(10)).join(".");
}, 12: mt, 16: mt, 20: mt, 24: function(e2, t2) {
  const i2 = e2.getUint16(t2), n2 = e2.getUint16(t2 + 2) - 1, s2 = e2.getUint16(t2 + 4), r2 = e2.getUint16(t2 + 6), a2 = e2.getUint16(t2 + 8), o2 = e2.getUint16(t2 + 10);
  return new Date(Date.UTC(i2, n2, s2, r2, a2, o2));
}, 36: mt, 40: mt, 48: mt, 52: mt, 64: (e2, t2) => e2.getUint32(t2), 80: mt };
function mt(e2, t2) {
  return m(e2.getString(t2, 4));
}
T.set("icc", pt), U(E, "icc", [[4, "ProfileCMMType"], [8, "ProfileVersion"], [12, "ProfileClass"], [16, "ColorSpaceData"], [20, "ProfileConnectionSpace"], [24, "ProfileDateTime"], [36, "ProfileFileSignature"], [40, "PrimaryPlatform"], [44, "CMMFlags"], [48, "DeviceManufacturer"], [52, "DeviceModel"], [56, "DeviceAttributes"], [64, "RenderingIntent"], [68, "ConnectionSpaceIlluminant"], [80, "ProfileCreator"], [84, "ProfileID"], ["Header", "ProfileHeader"], ["MS00", "WCSProfiles"], ["bTRC", "BlueTRC"], ["bXYZ", "BlueMatrixColumn"], ["bfd", "UCRBG"], ["bkpt", "MediaBlackPoint"], ["calt", "CalibrationDateTime"], ["chad", "ChromaticAdaptation"], ["chrm", "Chromaticity"], ["ciis", "ColorimetricIntentImageState"], ["clot", "ColorantTableOut"], ["clro", "ColorantOrder"], ["clrt", "ColorantTable"], ["cprt", "ProfileCopyright"], ["crdi", "CRDInfo"], ["desc", "ProfileDescription"], ["devs", "DeviceSettings"], ["dmdd", "DeviceModelDesc"], ["dmnd", "DeviceMfgDesc"], ["dscm", "ProfileDescriptionML"], ["fpce", "FocalPlaneColorimetryEstimates"], ["gTRC", "GreenTRC"], ["gXYZ", "GreenMatrixColumn"], ["gamt", "Gamut"], ["kTRC", "GrayTRC"], ["lumi", "Luminance"], ["meas", "Measurement"], ["meta", "Metadata"], ["mmod", "MakeAndModel"], ["ncl2", "NamedColor2"], ["ncol", "NamedColor"], ["ndin", "NativeDisplayInfo"], ["pre0", "Preview0"], ["pre1", "Preview1"], ["pre2", "Preview2"], ["ps2i", "PS2RenderingIntent"], ["ps2s", "PostScript2CSA"], ["psd0", "PostScript2CRD0"], ["psd1", "PostScript2CRD1"], ["psd2", "PostScript2CRD2"], ["psd3", "PostScript2CRD3"], ["pseq", "ProfileSequenceDesc"], ["psid", "ProfileSequenceIdentifier"], ["psvm", "PS2CRDVMSize"], ["rTRC", "RedTRC"], ["rXYZ", "RedMatrixColumn"], ["resp", "OutputResponse"], ["rhoc", "ReflectionHardcopyOrigColorimetry"], ["rig0", "PerceptualRenderingIntentGamut"], ["rig2", "SaturationRenderingIntentGamut"], ["rpoc", "ReflectionPrintOutputColorimetry"], ["sape", "SceneAppearanceEstimates"], ["scoe", "SceneColorimetryEstimates"], ["scrd", "ScreeningDesc"], ["scrn", "Screening"], ["targ", "CharTarget"], ["tech", "Technology"], ["vcgt", "VideoCardGamma"], ["view", "ViewingConditions"], ["vued", "ViewingCondDesc"], ["wtpt", "MediaWhitePoint"]]);
var St = { "4d2p": "Erdt Systems", AAMA: "Aamazing Technologies", ACER: "Acer", ACLT: "Acolyte Color Research", ACTI: "Actix Sytems", ADAR: "Adara Technology", ADBE: "Adobe", ADI: "ADI Systems", AGFA: "Agfa Graphics", ALMD: "Alps Electric", ALPS: "Alps Electric", ALWN: "Alwan Color Expertise", AMTI: "Amiable Technologies", AOC: "AOC International", APAG: "Apago", APPL: "Apple Computer", AST: "AST", "AT&T": "AT&T", BAEL: "BARBIERI electronic", BRCO: "Barco NV", BRKP: "Breakpoint", BROT: "Brother", BULL: "Bull", BUS: "Bus Computer Systems", "C-IT": "C-Itoh", CAMR: "Intel", CANO: "Canon", CARR: "Carroll Touch", CASI: "Casio", CBUS: "Colorbus PL", CEL: "Crossfield", CELx: "Crossfield", CGS: "CGS Publishing Technologies International", CHM: "Rochester Robotics", CIGL: "Colour Imaging Group, London", CITI: "Citizen", CL00: "Candela", CLIQ: "Color IQ", CMCO: "Chromaco", CMiX: "CHROMiX", COLO: "Colorgraphic Communications", COMP: "Compaq", COMp: "Compeq/Focus Technology", CONR: "Conrac Display Products", CORD: "Cordata Technologies", CPQ: "Compaq", CPRO: "ColorPro", CRN: "Cornerstone", CTX: "CTX International", CVIS: "ColorVision", CWC: "Fujitsu Laboratories", DARI: "Darius Technology", DATA: "Dataproducts", DCP: "Dry Creek Photo", DCRC: "Digital Contents Resource Center, Chung-Ang University", DELL: "Dell Computer", DIC: "Dainippon Ink and Chemicals", DICO: "Diconix", DIGI: "Digital", "DL&C": "Digital Light & Color", DPLG: "Doppelganger", DS: "Dainippon Screen", DSOL: "DOOSOL", DUPN: "DuPont", EPSO: "Epson", ESKO: "Esko-Graphics", ETRI: "Electronics and Telecommunications Research Institute", EVER: "Everex Systems", EXAC: "ExactCODE", Eizo: "Eizo", FALC: "Falco Data Products", FF: "Fuji Photo Film", FFEI: "FujiFilm Electronic Imaging", FNRD: "Fnord Software", FORA: "Fora", FORE: "Forefront Technology", FP: "Fujitsu", FPA: "WayTech Development", FUJI: "Fujitsu", FX: "Fuji Xerox", GCC: "GCC Technologies", GGSL: "Global Graphics Software", GMB: "Gretagmacbeth", GMG: "GMG", GOLD: "GoldStar Technology", GOOG: "Google", GPRT: "Giantprint", GTMB: "Gretagmacbeth", GVC: "WayTech Development", GW2K: "Sony", HCI: "HCI", HDM: "Heidelberger Druckmaschinen", HERM: "Hermes", HITA: "Hitachi America", HP: "Hewlett-Packard", HTC: "Hitachi", HiTi: "HiTi Digital", IBM: "IBM", IDNT: "Scitex", IEC: "Hewlett-Packard", IIYA: "Iiyama North America", IKEG: "Ikegami Electronics", IMAG: "Image Systems", IMI: "Ingram Micro", INTC: "Intel", INTL: "N/A (INTL)", INTR: "Intra Electronics", IOCO: "Iocomm International Technology", IPS: "InfoPrint Solutions Company", IRIS: "Scitex", ISL: "Ichikawa Soft Laboratory", ITNL: "N/A (ITNL)", IVM: "IVM", IWAT: "Iwatsu Electric", Idnt: "Scitex", Inca: "Inca Digital Printers", Iris: "Scitex", JPEG: "Joint Photographic Experts Group", JSFT: "Jetsoft Development", JVC: "JVC Information Products", KART: "Scitex", KFC: "KFC Computek Components", KLH: "KLH Computers", KMHD: "Konica Minolta", KNCA: "Konica", KODA: "Kodak", KYOC: "Kyocera", Kart: "Scitex", LCAG: "Leica", LCCD: "Leeds Colour", LDAK: "Left Dakota", LEAD: "Leading Technology", LEXM: "Lexmark International", LINK: "Link Computer", LINO: "Linotronic", LITE: "Lite-On", Leaf: "Leaf", Lino: "Linotronic", MAGC: "Mag Computronic", MAGI: "MAG Innovision", MANN: "Mannesmann", MICN: "Micron Technology", MICR: "Microtek", MICV: "Microvitec", MINO: "Minolta", MITS: "Mitsubishi Electronics America", MITs: "Mitsuba", MNLT: "Minolta", MODG: "Modgraph", MONI: "Monitronix", MONS: "Monaco Systems", MORS: "Morse Technology", MOTI: "Motive Systems", MSFT: "Microsoft", MUTO: "MUTOH INDUSTRIES", Mits: "Mitsubishi Electric", NANA: "NANAO", NEC: "NEC", NEXP: "NexPress Solutions", NISS: "Nissei Sangyo America", NKON: "Nikon", NONE: "none", OCE: "Oce Technologies", OCEC: "OceColor", OKI: "Oki", OKID: "Okidata", OKIP: "Okidata", OLIV: "Olivetti", OLYM: "Olympus", ONYX: "Onyx Graphics", OPTI: "Optiquest", PACK: "Packard Bell", PANA: "Matsushita Electric Industrial", PANT: "Pantone", PBN: "Packard Bell", PFU: "PFU", PHIL: "Philips Consumer Electronics", PNTX: "HOYA", POne: "Phase One A/S", PREM: "Premier Computer Innovations", PRIN: "Princeton Graphic Systems", PRIP: "Princeton Publishing Labs", QLUX: "Hong Kong", QMS: "QMS", QPCD: "QPcard AB", QUAD: "QuadLaser", QUME: "Qume", RADI: "Radius", RDDx: "Integrated Color Solutions", RDG: "Roland DG", REDM: "REDMS Group", RELI: "Relisys", RGMS: "Rolf Gierling Multitools", RICO: "Ricoh", RNLD: "Edmund Ronald", ROYA: "Royal", RPC: "Ricoh Printing Systems", RTL: "Royal Information Electronics", SAMP: "Sampo", SAMS: "Samsung", SANT: "Jaime Santana Pomares", SCIT: "Scitex", SCRN: "Dainippon Screen", SDP: "Scitex", SEC: "Samsung", SEIK: "Seiko Instruments", SEIk: "Seikosha", SGUY: "ScanGuy.com", SHAR: "Sharp Laboratories", SICC: "International Color Consortium", SONY: "Sony", SPCL: "SpectraCal", STAR: "Star", STC: "Sampo Technology", Scit: "Scitex", Sdp: "Scitex", Sony: "Sony", TALO: "Talon Technology", TAND: "Tandy", TATU: "Tatung", TAXA: "TAXAN America", TDS: "Tokyo Denshi Sekei", TECO: "TECO Information Systems", TEGR: "Tegra", TEKT: "Tektronix", TI: "Texas Instruments", TMKR: "TypeMaker", TOSB: "Toshiba", TOSH: "Toshiba", TOTK: "TOTOKU ELECTRIC", TRIU: "Triumph", TSBT: "Toshiba", TTX: "TTX Computer Products", TVM: "TVM Professional Monitor", TW: "TW Casper", ULSX: "Ulead Systems", UNIS: "Unisys", UTZF: "Utz Fehlau & Sohn", VARI: "Varityper", VIEW: "Viewsonic", VISL: "Visual communication", VIVO: "Vivo Mobile Communication", WANG: "Wang", WLBR: "Wilbur Imaging", WTG2: "Ware To Go", WYSE: "WYSE Technology", XERX: "Xerox", XRIT: "X-Rite", ZRAN: "Zoran", Zebr: "Zebra Technologies", appl: "Apple Computer", bICC: "basICColor", berg: "bergdesign", ceyd: "Integrated Color Solutions", clsp: "MacDermid ColorSpan", ds: "Dainippon Screen", dupn: "DuPont", ffei: "FujiFilm Electronic Imaging", flux: "FluxData", iris: "Scitex", kart: "Scitex", lcms: "Little CMS", lino: "Linotronic", none: "none", ob4d: "Erdt Systems", obic: "Medigraph", quby: "Qubyx Sarl", scit: "Scitex", scrn: "Dainippon Screen", sdp: "Scitex", siwi: "SIWI GRAFIKA", yxym: "YxyMaster" };
var Ct = { scnr: "Scanner", mntr: "Monitor", prtr: "Printer", link: "Device Link", abst: "Abstract", spac: "Color Space Conversion Profile", nmcl: "Named Color", cenc: "ColorEncodingSpace profile", mid: "MultiplexIdentification profile", mlnk: "MultiplexLink profile", mvis: "MultiplexVisualization profile", nkpf: "Nikon Input Device Profile (NON-STANDARD!)" };
U(B, "icc", [[4, St], [12, Ct], [40, Object.assign({}, St, Ct)], [48, St], [80, St], [64, { 0: "Perceptual", 1: "Relative Colorimetric", 2: "Saturation", 3: "Absolute Colorimetric" }], ["tech", { amd: "Active Matrix Display", crt: "Cathode Ray Tube Display", kpcd: "Photo CD", pmd: "Passive Matrix Display", dcam: "Digital Camera", dcpj: "Digital Cinema Projector", dmpc: "Digital Motion Picture Camera", dsub: "Dye Sublimation Printer", epho: "Electrophotographic Printer", esta: "Electrostatic Printer", flex: "Flexography", fprn: "Film Writer", fscn: "Film Scanner", grav: "Gravure", ijet: "Ink Jet Printer", imgs: "Photo Image Setter", mpfr: "Motion Picture Film Recorder", mpfs: "Motion Picture Film Scanner", offs: "Offset Lithography", pjtv: "Projection Television", rpho: "Photographic Paper Printer", rscn: "Reflective Scanner", silk: "Silkscreen", twax: "Thermal Wax Printer", vidc: "Video Camera", vidm: "Video Monitor" }]]);
var yt = class extends re {
  static canHandle(e2, t2, i2) {
    return 237 === e2.getUint8(t2 + 1) && "Photoshop" === e2.getString(t2 + 4, 9) && void 0 !== this.containsIptc8bim(e2, t2, i2);
  }
  static headerLength(e2, t2, i2) {
    let n2, s2 = this.containsIptc8bim(e2, t2, i2);
    if (void 0 !== s2)
      return n2 = e2.getUint8(t2 + s2 + 7), n2 % 2 != 0 && (n2 += 1), 0 === n2 && (n2 = 4), s2 + 8 + n2;
  }
  static containsIptc8bim(e2, t2, i2) {
    for (let n2 = 0; n2 < i2; n2++)
      if (this.isIptcSegmentHead(e2, t2 + n2))
        return n2;
  }
  static isIptcSegmentHead(e2, t2) {
    return 56 === e2.getUint8(t2) && 943868237 === e2.getUint32(t2) && 1028 === e2.getUint16(t2 + 4);
  }
  parse() {
    let { raw: e2 } = this, t2 = this.chunk.byteLength - 1, i2 = false;
    for (let n2 = 0; n2 < t2; n2++)
      if (28 === this.chunk.getUint8(n2) && 2 === this.chunk.getUint8(n2 + 1)) {
        i2 = true;
        let t3 = this.chunk.getUint16(n2 + 3), s2 = this.chunk.getUint8(n2 + 2), r2 = this.chunk.getLatin1String(n2 + 5, t3);
        e2.set(s2, this.pluralizeValue(e2.get(s2), r2)), n2 += 4 + t3;
      } else if (i2)
        break;
    return this.translate(), this.output;
  }
  pluralizeValue(e2, t2) {
    return void 0 !== e2 ? e2 instanceof Array ? (e2.push(t2), e2) : [e2, t2] : t2;
  }
};
c(yt, "type", "iptc"), c(yt, "translateValues", false), c(yt, "reviveValues", false), T.set("iptc", yt), U(E, "iptc", [[0, "ApplicationRecordVersion"], [3, "ObjectTypeReference"], [4, "ObjectAttributeReference"], [5, "ObjectName"], [7, "EditStatus"], [8, "EditorialUpdate"], [10, "Urgency"], [12, "SubjectReference"], [15, "Category"], [20, "SupplementalCategories"], [22, "FixtureIdentifier"], [25, "Keywords"], [26, "ContentLocationCode"], [27, "ContentLocationName"], [30, "ReleaseDate"], [35, "ReleaseTime"], [37, "ExpirationDate"], [38, "ExpirationTime"], [40, "SpecialInstructions"], [42, "ActionAdvised"], [45, "ReferenceService"], [47, "ReferenceDate"], [50, "ReferenceNumber"], [55, "DateCreated"], [60, "TimeCreated"], [62, "DigitalCreationDate"], [63, "DigitalCreationTime"], [65, "OriginatingProgram"], [70, "ProgramVersion"], [75, "ObjectCycle"], [80, "Byline"], [85, "BylineTitle"], [90, "City"], [92, "Sublocation"], [95, "State"], [100, "CountryCode"], [101, "Country"], [103, "OriginalTransmissionReference"], [105, "Headline"], [110, "Credit"], [115, "Source"], [116, "CopyrightNotice"], [118, "Contact"], [120, "Caption"], [121, "LocalCaption"], [122, "Writer"], [125, "RasterizedCaption"], [130, "ImageType"], [131, "ImageOrientation"], [135, "LanguageIdentifier"], [150, "AudioType"], [151, "AudioSamplingRate"], [152, "AudioSamplingResolution"], [153, "AudioDuration"], [154, "AudioOutcue"], [184, "JobID"], [185, "MasterDocumentID"], [186, "ShortDocumentID"], [187, "UniqueDocumentID"], [188, "OwnerID"], [200, "ObjectPreviewFileFormat"], [201, "ObjectPreviewFileVersion"], [202, "ObjectPreviewData"], [221, "Prefs"], [225, "ClassifyState"], [228, "SimilarityIndex"], [230, "DocumentNotes"], [231, "DocumentHistory"], [232, "ExifCameraInfo"], [255, "CatalogSets"]]), U(B, "iptc", [[10, { 0: "0 (reserved)", 1: "1 (most urgent)", 2: "2", 3: "3", 4: "4", 5: "5 (normal urgency)", 6: "6", 7: "7", 8: "8 (least urgent)", 9: "9 (user-defined priority)" }], [75, { a: "Morning", b: "Both Morning and Evening", p: "Evening" }], [131, { L: "Landscape", P: "Portrait", S: "Square" }]]);

// src/exif-reader.ts
async function extractExifGps(buffer) {
  try {
    const result = await ie(buffer, {
      gps: true,
      pick: [
        "GPSLatitude",
        "GPSLongitude",
        "GPSAltitude",
        "GPSLatitudeRef",
        "GPSLongitudeRef",
        "DateTimeOriginal",
        "CreateDate",
        "ModifyDate",
        "latitude",
        "longitude"
      ]
    });
    if (!result) {
      return { hasGps: false };
    }
    const lat = result.latitude ?? void 0;
    const lng = result.longitude ?? void 0;
    const alt = result.GPSAltitude ?? void 0;
    const datetime = formatExifDate(
      result.DateTimeOriginal || result.CreateDate || result.ModifyDate
    );
    return {
      lat,
      lng,
      alt: alt != null ? Math.round(alt) : void 0,
      datetime,
      hasGps: lat != null && lng != null
    };
  } catch (err) {
    console.warn("[HJ] EXIF extraction failed:", err);
    return { hasGps: false };
  }
}
function formatExifDate(date) {
  if (!date)
    return void 0;
  if (date instanceof Date) {
    return date.toISOString();
  }
  if (typeof date === "string") {
    const match = date.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`;
    }
    return date;
  }
  return void 0;
}

// src/journal-wizard.ts
init_track_parser();
var ROOT2 = "hiking-journal";

// === Gemini AI Helpers ===
async function analyzePhotoWithGemini(buffer, apiKey, model, routeContext) {
  model = model || "gemini-2.0-flash";
  const uint8 = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i += 8192) {
    binary += String.fromCharCode(...uint8.subarray(i, i + 8192));
  }
  const base64 = btoa(binary);
  let geoConstraint = "";
  if (routeContext) {
    const { minLat, maxLat, minLng, maxLng, centerLat, centerLng, region } = routeContext;
    geoConstraint = `\n\nCRITICAL GEOGRAPHIC CONSTRAINT: This photo was taken during a trip along a GPS route strictly within the following area:${region ? `\n- Region: ${region}` : ""}
- Route center: approximately ${centerLat.toFixed(4)}°, ${centerLng.toFixed(4)}°
- Bounding box: lat ${minLat.toFixed(4)} to ${maxLat.toFixed(4)}, lng ${minLng.toFixed(4)} to ${maxLng.toFixed(4)}
You MUST identify a location within or immediately adjacent to this bounding box. Do NOT suggest venues, stadiums, or landmarks in other cities or regions even if the photo visually resembles them.`;
  }
  const body = {
    contents: [{
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64
          }
        },
        {
          text: `Analyze this photo and identify the geographic location where it was taken.${geoConstraint}
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "lat": <number or null>,
  "lng": <number or null>,
  "locationName": "<descriptive name of the place>",
  "confidence": "<high|medium|low>",
  "reasoning": "<brief explanation>"
}
If you cannot determine a specific location, set lat and lng to null and provide your best guess for locationName based on visible landmarks, signs, or scenery.`
        }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
  };
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch (e2) {
    return { lat: null, lng: null, locationName: "Unknown", confidence: "low", reasoning: e2.message };
  }
}

async function enrichLocationWithGemini(lat, lng, locationName, apiKey, model) {
  model = model || "gemini-2.0-flash";
  const prompt = `You are a travel guide assistant. Provide brief, interesting information about this location:
Name: ${locationName}
Coordinates: ${lat}, ${lng}

Return ONLY a valid JSON object (no markdown):
{
  "description": "<2-3 sentences of interesting facts, history, or travel tips>",
  "category": "<e.g. Mountain, Temple, City, Waterfall, Viewpoint, etc.>",
  "highlights": ["<highlight 1>", "<highlight 2>", "<highlight 3>"]
}`;
  try {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
    };
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    return JSON.parse(jsonMatch[0]);
  } catch (e2) {
    throw e2;
  }
}

async function summarizeTripWithGemini(trip, apiKey, model) {
  model = model || "gemini-2.0-flash";
  const prompt = `You are a travel storyteller. Summarize this hiking/travel journey in 2-3 sentences, make it vivid and inspiring.
Trip: ${trip.name}
Region: ${trip.region || "Unknown"}
Date: ${trip.date || "Unknown"}
Distance: ${trip.distanceKm ? trip.distanceKm.toFixed(1) + " km" : "Unknown"}
Waypoints: ${trip.waypointCount || 0}
Routes: ${trip.routeCount || 1}

Write a brief, engaging summary in the same language as the trip name. If the name is in Chinese, write in Chinese. If in English, write in English.`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.8, maxOutputTokens: 256 }
  };
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!resp.ok) throw new Error(`Gemini API error: ${resp.status}`);
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text.trim();
}

function detectAspectRatio(buffer) {
  // Parse JPEG SOF markers to extract image width/height
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < arr.length - 8; i++) {
    if (arr[i] === 0xFF && (arr[i+1] === 0xC0 || arr[i+1] === 0xC1 || arr[i+1] === 0xC2)) {
      const h = (arr[i+5] << 8) | arr[i+6];
      const w = (arr[i+7] << 8) | arr[i+8];
      if (w && h) {
        const r = w / h;
        const ratios = [[16/9,"16/9"],[3/2,"3/2"],[4/3,"4/3"],[1,"1/1"],[3/4,"3/4"],[2/3,"2/3"],[9/16,"9/16"]];
        let best = ratios[0];
        for (const c of ratios) if (Math.abs(c[0]-r) < Math.abs(best[0]-r)) best = c;
        return best[1];
      }
    }
  }
  return "4/3";
}
async function nameLocationWithGemini(lat, lng, apiKey, model) {
  // Primary: Nominatim (OpenStreetMap) reverse geocoding — accurate, free, no extra key
  try {
    const nmResp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=zh,en`,
      { headers: { "User-Agent": "HikingJournalPlugin/1.0" } }
    );
    if (nmResp.ok) {
      const nm = await nmResp.json();
      const a = nm.address || {};
      const name = a.tourism || a.amenity || a.building || a.historic || a.leisure ||
        (a.road ? (a.suburb ? `${a.road}, ${a.suburb}` : a.road) : null) ||
        a.suburb || a.neighbourhood || a.village || a.town || a.city ||
        (nm.display_name ? nm.display_name.split(",")[0] : null);
      if (name) return name.trim();
    }
  } catch {}
  // Fallback: Gemini (when Nominatim fails or returns nothing)
  if (!apiKey) return null;
  model = model || "gemini-2.0-flash";
  try {
    const body = {
      contents: [{ parts: [{ text: `Given coordinates lat=${lat}, lng=${lng}, provide a concise location name (place name, landmark, neighborhood, or city). Return ONLY a plain text name, 2-6 words maximum, no JSON, no explanation.` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 32 }
    };
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!resp.ok) throw new Error(`${resp.status}`);
    const data = await resp.json();
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
    return text.replace(/^["']|["']$/g, "").trim() || null;
  } catch { return null; }
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clusterLocationsByDistance(locations, thresholdKm) {
  const n = locations.length;
  if (n === 0) return [];
  // Union-Find
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(x, y) { parent[find(x)] = find(y); }
  for (let i = 0; i < n; i++) {
    if (!locations[i].lat || !locations[i].lng) continue;
    for (let j = i + 1; j < n; j++) {
      if (!locations[j].lat || !locations[j].lng) continue;
      if (haversineKm(locations[i].lat, locations[i].lng, locations[j].lat, locations[j].lng) < thresholdKm) {
        union(i, j);
      }
    }
  }
  // Group indices by root
  const groups = {};
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups[root]) groups[root] = [];
    groups[root].push(i);
  }
  return Object.values(groups).map((indices) => {
    const locs = indices.map((i) => locations[i]);
    // Prefer EXIF location coords (GPS hardware, most accurate)
    const exifLoc = locs.find((l) => l.gpsSource === "exif");
    const avgLat = locs.filter((l) => l.lat).reduce((s, l) => s + l.lat, 0) / locs.filter((l) => l.lat).length;
    const avgLng = locs.filter((l) => l.lng).reduce((s, l) => s + l.lng, 0) / locs.filter((l) => l.lng).length;
    // Best title: prefer AI-named non-EXIF (usually more descriptive), then EXIF-named
    const aiNamed = locs.find((l) => l.gpsSource !== "exif" && l.title && !l.title.startsWith("Location ("));
    const bestTitle = aiNamed?.title || exifLoc?.title || locs[0].title;
    // Combine all photos from merged locations
    const allPhotos = locs.flatMap((l) => l.photos || []);
    return {
      ...locs[0],
      lat: exifLoc ? exifLoc.lat : avgLat,
      lng: exifLoc ? exifLoc.lng : avgLng,
      title: bestTitle,
      photos: allPhotos,
      gpsSource: exifLoc ? "exif" : locs[0].gpsSource,
    };
  });
}

var JournalWizard = class extends import_obsidian4.Modal {
  constructor(app, manager, onComplete, settings, existingTripId) {
    super(app);
    this.step = 1;
    // Step 1 data
    this.config = {
      name: "",
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      endDate: "",
      region: "",
      description: "",
      mapStyle: "opentopomap"
    };
    // V4: Multi-track data (replaces single track)
    this.tracks = [];
    this.trackCounter = 0;
    // V4: Location stops
    this.locations = [];
    this.locationCounter = 0;
    // Photo data (shared across locations)
    this.photos = /* @__PURE__ */ new Map();
    this.photoBuffers = /* @__PURE__ */ new Map();
    this.photoCounter = 0;
    // Selected location for photo upload
    this.selectedLocationId = null;
    // AI mode state
    this.useAiLocation = false;
    this.aiAnalysisResults = [];
    // Legacy compat
    this.sections = [];
    this.sectionCounter = 0;
    this.trackFile = null;
    this.trackContent = null;
    this.trackFileName = "";
    this.trackResult = null;
    this.manager = manager;
    this.onComplete = onComplete;
    this.settings = settings || {};
    this.existingTripId = existingTripId || null;
  }
  onOpen() {
    this.modalEl.addClass("hj-wizard-modal");
    this.renderStep();
  }
  onClose() {
    this.contentEl.empty();
  }
  renderStep() {
    this.contentEl.empty();
    switch (this.step) {
      case 1:
        this.renderStep1();
        break;
      case 2:
        this.renderStep2Locations();
        break;
      case 3:
        this.renderStep3Photos();
        break;
      case 4:
        this.renderStep4Structure();
        break;
      case 5:
        this.renderStep5Review();
        break;
    }
  }
  // ==============================
  // Step 1: Trip Info + Multi-GPX Upload
  // ==============================
  renderStep1() {
    const el = this.contentEl;
    el.createEl("h2", { text: this.existingTripId ? "Step 1: Upload Route(s)" : "Step 1: Trip Info" });
    el.createEl("p", { text: this.existingTripId ? "Upload GPX route file(s) to add to the existing journal." : "Basic information and route files for your hiking trip.", cls: "hj-wizard-hint" });
    if (!this.existingTripId) {
    const nameDiv = el.createDiv({ cls: "hj-wizard-field" });
    nameDiv.createEl("label", { text: "Trip Name *" });
    const nameInput = nameDiv.createEl("input", {
      type: "text",
      placeholder: "e.g. Kumano Kodo Pilgrimage",
      cls: "hj-wizard-input",
      value: this.config.name
    });
    nameInput.addEventListener("input", () => this.config.name = nameInput.value);
    const dateRow = el.createDiv({ cls: "hj-wizard-field" });
    const dateCols = dateRow.createDiv();
    dateCols.style.cssText = "display:flex;gap:12px;";
    const startCol = dateCols.createDiv({ cls: "hj-wizard-field" });
    startCol.style.flex = "1";
    startCol.createEl("label", { text: "Start Date" });
    const dateInput = startCol.createEl("input", {
      type: "date",
      cls: "hj-wizard-input",
      value: this.config.date
    });
    dateInput.addEventListener("input", () => this.config.date = dateInput.value);
    const endCol = dateCols.createDiv({ cls: "hj-wizard-field" });
    endCol.style.flex = "1";
    endCol.createEl("label", { text: "End Date" });
    const endDateInput = endCol.createEl("input", {
      type: "date",
      cls: "hj-wizard-input",
      value: this.config.endDate || ""
    });
    endDateInput.addEventListener("input", () => this.config.endDate = endDateInput.value);
    const regionDiv = el.createDiv({ cls: "hj-wizard-field" });
    regionDiv.createEl("label", { text: "Region" });
    const regionInput = regionDiv.createEl("input", {
      type: "text",
      placeholder: "e.g. Kii Peninsula, Japan",
      cls: "hj-wizard-input",
      value: this.config.region
    });
    regionInput.addEventListener("input", () => this.config.region = regionInput.value);
    const descDiv = el.createDiv({ cls: "hj-wizard-field" });
    descDiv.createEl("label", { text: "Description (optional)" });
    const descInput = descDiv.createEl("textarea", {
      placeholder: "Brief description of your trip...",
      cls: "hj-wizard-textarea"
    });
    descInput.value = this.config.description;
    descInput.rows = 3;
    descInput.addEventListener("input", () => this.config.description = descInput.value);
    // === Map Style Selector ===
    const mapStyleDiv = el.createDiv({ cls: "hj-wizard-field" });
    mapStyleDiv.createEl("label", { text: "Map Style" });
    const mapStyleRow = mapStyleDiv.createDiv({ cls: "hj-map-style-row" });
    const mapStyleSelect = mapStyleRow.createEl("select", { cls: "hj-wizard-input hj-map-style-select" });
    for (const [key, style] of Object.entries(MAP_STYLES)) {
      const opt = mapStyleSelect.createEl("option", { text: style.name, value: key });
      if (key === this.config.mapStyle)
        opt.selected = true;
    }
    const mapStylePreview = mapStyleRow.createDiv({ cls: "hj-map-style-preview" });
    const showPreview = (key) => {
      const style = MAP_STYLES[key];
      if (!style)
        return;
      mapStylePreview.empty();
      let url = style.url.replace("{z}", "5").replace("{x}", "17").replace("{y}", "11").replace("{s}", style.subs[0] || "");
      if (style.needsApiKey && STADIA_API_KEY) url += (url.includes("?") ? "&" : "?") + "api_key=" + STADIA_API_KEY;
      const img = mapStylePreview.createEl("img", { cls: "hj-map-style-thumb" });
      img.src = url;
      img.alt = style.name;
    };
    showPreview(this.config.mapStyle);
    mapStyleSelect.addEventListener("change", () => {
      this.config.mapStyle = mapStyleSelect.value;
      showPreview(mapStyleSelect.value);
    });
    } // end !existingTripId config block
    // === Multi-GPX Route Upload ===
    const gpxDiv = el.createDiv({ cls: "hj-wizard-field" });
    gpxDiv.createEl("label", { text: "Route Files (optional, supports multiple)" });
    const gpxDrop = gpxDiv.createDiv({ cls: "hj-drop-zone hj-drop-sm" });
    gpxDrop.createEl("div", { text: "\u{1F4C2}", cls: "hj-drop-icon" });
    gpxDrop.createEl("div", { text: "Drop .gpx / .kml / .kmz / .fit / .plt files (multiple supported)" });
    const trackListEl = gpxDiv.createDiv({ cls: "hj-track-list" });
    const renderTrackList = () => {
      trackListEl.empty();
      if (this.tracks.length === 0) return;
      for (const track of this.tracks) {
        const item = trackListEl.createDiv({ cls: "hj-track-item" });
        const nameIn = item.createEl("input", {
          type: "text",
          cls: "hj-track-name-input",
          value: track.name,
          placeholder: "Route name (e.g. Day 1)"
        });
        nameIn.addEventListener("input", () => { track.name = nameIn.value; });
        item.createEl("span", {
          text: `${track.fileName} (${track.result.trackPoints.length} pts, ${track.result.totalDistanceKm.toFixed(1)} km)`,
          cls: "hj-track-meta"
        });
        const delBtn = item.createEl("button", { text: "\u2715", cls: "hj-btn-icon-sm hj-btn-danger" });
        delBtn.addEventListener("click", () => {
          this.tracks = this.tracks.filter((t) => t.id !== track.id);
          renderTrackList();
        });
      }
    };
    renderTrackList();
    const gpxFileInput = gpxDiv.createEl("input", { type: "file" });
    gpxFileInput.accept = ACCEPT_STRING;
    gpxFileInput.multiple = true;
    gpxFileInput.style.display = "none";
    gpxDrop.addEventListener("click", () => gpxFileInput.click());
    gpxDrop.addEventListener("dragover", (e2) => {
      e2.preventDefault();
      gpxDrop.addClass("hj-drop-active");
    });
    gpxDrop.addEventListener("dragleave", () => gpxDrop.removeClass("hj-drop-active"));
    const handleMultiTrackImport = async (files) => {
      for (const file of files) {
        try {
          const fmt = detectFormat(file.name);
          if (!fmt) {
            new import_obsidian4.Notice(`Unsupported format: ${file.name}`);
            continue;
          }
          const result = await parseTrackFile(file);
          let content;
          if (fmt === "fit" || fmt === "kmz") {
            content = await file.arrayBuffer();
          } else {
            content = await file.text();
          }
          this.trackCounter++;
          const trackId = `route-${this.trackCounter}`;
          this.tracks.push({
            id: trackId,
            name: `Route ${this.trackCounter}`,
            fileName: file.name,
            content,
            result,
            date: ""
          });
          // Also set legacy single-track fields for backward compat
          this.trackResult = result;
          this.trackFileName = file.name;
          this.trackContent = content;
        } catch (err) {
          new import_obsidian4.Notice(`Failed to import ${file.name}: ${err.message}`);
        }
      }
      renderTrackList();
      if (this.tracks.length > 0) {
        new import_obsidian4.Notice(`Imported ${this.tracks.length} route file(s)`);
      }
    };
    gpxDrop.addEventListener("drop", async (e2) => {
      e2.preventDefault();
      gpxDrop.removeClass("hj-drop-active");
      if (e2.dataTransfer?.files?.length) {
        await handleMultiTrackImport(Array.from(e2.dataTransfer.files));
      }
    });
    gpxFileInput.addEventListener("change", async () => {
      if (gpxFileInput.files?.length) {
        await handleMultiTrackImport(Array.from(gpxFileInput.files));
      }
    });
    this.renderFooter(el, {
      nextLabel: "Next: Select Locations \u2192",
      onNext: () => {
        if (!this.existingTripId && !this.config.name.trim()) {
          new import_obsidian4.Notice("Please enter a trip name");
          return;
        }
        if (this.existingTripId && this.tracks.length === 0) {
          new import_obsidian4.Notice("Please upload at least one route file");
          return;
        }
        this.step = 2;
        this.renderStep();
      }
    });
  }
  // ==============================
  // Step 2: Select Locations on Routes
  // ==============================
  renderStep2Locations() {
    const el = this.contentEl;
    el.createEl("h2", { text: "Step 2: Select Locations" });
    const geminiKey = this.settings?.geminiApiKey || "";

    // === Mode selector ===
    const modeRow = el.createDiv({ cls: "hj-mode-row" });
    modeRow.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:12px;padding:10px;background:var(--background-secondary);border-radius:8px;flex-wrap:wrap;";
    modeRow.createEl("span", { text: "Location mode:", cls: "hj-mode-label" });
    const manualBtn = modeRow.createEl("button", { text: "✋ Manual", cls: this.useAiLocation ? "hj-btn-secondary hj-btn-sm" : "hj-btn-primary hj-btn-sm" });
    const aiBtn = modeRow.createEl("button", { text: "AI-Assisted (Gemini)", cls: this.useAiLocation ? "hj-btn-primary hj-btn-sm" : "hj-btn-secondary hj-btn-sm" });
    if (!geminiKey) {
      aiBtn.disabled = true;
      aiBtn.title = "Set Gemini API key in Settings first";
      const warn = modeRow.createEl("span", { text: "Set Gemini API key in plugin Settings to enable", cls: "hj-warn-text" });
      warn.style.cssText = "color:var(--text-warning);font-size:12px;";
    }

    const mainArea = el.createDiv({ cls: "hj-step2-main" });

    const renderMainArea = () => {
      mainArea.empty();
      if (this.useAiLocation) {
        this.renderStep2AiMode(mainArea, geminiKey);
      } else {
        this.renderStep2ManualMode(mainArea);
      }
    };

    manualBtn.addEventListener("click", () => {
      this.useAiLocation = false;
      manualBtn.className = "hj-btn-primary hj-btn-sm";
      aiBtn.className = "hj-btn-secondary hj-btn-sm";
      renderMainArea();
    });
    aiBtn.addEventListener("click", () => {
      if (!geminiKey) return;
      this.useAiLocation = true;
      aiBtn.className = "hj-btn-primary hj-btn-sm";
      manualBtn.className = "hj-btn-secondary hj-btn-sm";
      renderMainArea();
    });

    renderMainArea();

    this.renderFooter(el, {
      backLabel: "\u2190 Back",
      onBack: () => { this.step = 1; this.renderStep(); },
      nextLabel: "Next: Upload Photos \u2192",
      onNext: () => {
        if (this.locations.length === 0 && this.tracks.length === 0) {
          new import_obsidian4.Notice("Please add at least one location or route");
          return;
        }
        if (this.locations.length === 0 && this.tracks.length > 0) {
          for (const track of this.tracks) {
            const pts = track.result.trackPoints;
            const numStops = Math.min(8, Math.max(2, Math.floor(track.result.totalDistanceKm / 3)));
            const step = Math.max(1, Math.floor(pts.length / numStops));
            for (let i = 0; i < pts.length; i += step) {
              this.locationCounter++;
              this.locations.push({
                id: `loc-${this.locationCounter}`, routeId: track.id,
                lat: Math.round(pts[i].lat * 1e6) / 1e6, lng: Math.round(pts[i].lng * 1e6) / 1e6, alt: pts[i].ele,
                title: `${track.name || "Route"} - Stop ${this.locationCounter}`,
                description: "", blog: "", photos: [], gpsSource: "gpx", sortOrder: this.locationCounter - 1
              });
            }
          }
        }
        this.step = 3;
        this.renderStep();
      }
    });
  }

  // Manual mode sub-renderer
  renderStep2ManualMode(el) {
    el.createEl("p", {
      text: "Click on the route to add locations with precise GPX coordinates, or use the buttons below.",
      cls: "hj-wizard-hint"
    });
    const locToolbar = el.createDiv({ cls: "hj-section-toolbar" });
    const addLocBtn = locToolbar.createEl("button", { text: "+ Add Location", cls: "hj-btn-primary hj-btn-sm" });
    const autoLocBtn = locToolbar.createEl("button", { text: "Auto-generate stops", cls: "hj-btn-secondary hj-btn-sm" });
    // Map container for route visualization
    if (this.tracks.length > 0) {
      const mapWrap = el.createDiv({ cls: "hj-wizard-map-wrap" });
      mapWrap.style.height = "400px";
      mapWrap.style.marginBottom = "12px";
      mapWrap.style.borderRadius = "8px";
      mapWrap.style.overflow = "hidden";
      mapWrap.style.border = "1px solid var(--background-modifier-border)";
      setTimeout(() => {
        if (!mapWrap.isConnected) return;
        const wizMap = L2.map(mapWrap, { zoomControl: true, attributionControl: false });
        L2.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd", maxZoom: 19
        }).addTo(wizMap);
        const allPts = [];
        const routeColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
        for (let ti = 0; ti < this.tracks.length; ti++) {
          const track = this.tracks[ti];
          const color = routeColors[ti % routeColors.length];
          const pts = track.result.trackPoints;
          const step = Math.max(1, Math.floor(pts.length / 300));
          const latLngs = [];
          for (let i = 0; i < pts.length; i += step) {
            latLngs.push([pts[i].lat, pts[i].lng]);
            allPts.push([pts[i].lat, pts[i].lng]);
          }
          latLngs.push([pts[pts.length - 1].lat, pts[pts.length - 1].lng]);
          allPts.push([pts[pts.length - 1].lat, pts[pts.length - 1].lng]);
          L2.polyline(latLngs, { color, weight: 5, opacity: 0.8, interactive: false }).addTo(wizMap);
        }
        if (allPts.length > 0) {
          wizMap.fitBounds(allPts, { padding: [20, 20] });
        }
        // Show existing location markers
        let locMarkers = [];
        const refreshMapMarkers = () => {
          locMarkers.forEach((m) => wizMap.removeLayer(m));
          locMarkers = [];
          for (const loc of this.locations) {
            if (loc.lat && loc.lng) {
              const marker = L2.circleMarker([loc.lat, loc.lng], {
                radius: 7, fillColor: "#ef4444", color: "#fff",
                weight: 2, fillOpacity: 0.9
              }).addTo(wizMap);
              marker.bindTooltip(loc.title || "Location", { permanent: false });
              locMarkers.push(marker);
            }
          }
        };
        refreshMapMarkers();
        // Click anywhere on map → place location at exact click position
        wizMap.on("click", (e) => {
          const lat = Math.round(e.latlng.lat * 1e6) / 1e6;
          const lng = Math.round(e.latlng.lng * 1e6) / 1e6;
          // Find nearest track for routeId
          let bestDist2 = Infinity, bestTrack = null;
          for (const track of this.tracks) {
            const pts = track.result.trackPoints;
            for (let i = 0; i < pts.length; i++) {
              const d2 = (lat - pts[i].lat) ** 2 + (lng - pts[i].lng) ** 2;
              if (d2 < bestDist2) { bestDist2 = d2; bestTrack = track; }
            }
          }
          this.locationCounter++;
          this.locations.push({
            id: `loc-${this.locationCounter}`,
            routeId: bestTrack ? bestTrack.id : "",
            lat, lng, alt: void 0,
            title: `Location ${this.locationCounter}`,
            description: "", blog: "", photos: [],
            gpsSource: "manual",
            sortOrder: this.locations.length
          });
          refreshMapMarkers();
          renderLocList();
        });
        // Store refresh fn for button use
        this._refreshMapMarkers = refreshMapMarkers;
      }, 100);
    }
    // Location list
    const locListEl = el.createDiv({ cls: "hj-locations-list" });
    const renderLocList = () => {
      locListEl.empty();
      if (this.locations.length === 0) {
        locListEl.createDiv({ text: "No locations yet. Click on the route to add stops, or use the buttons above.", cls: "hj-empty-hint" });
        return;
      }
      for (const loc of this.locations) {
        const item = locListEl.createDiv({ cls: "hj-location-item" });
        const titleIn = item.createEl("input", {
          type: "text", cls: "hj-wizard-input hj-loc-title",
          value: loc.title, placeholder: "Location name"
        });
        titleIn.addEventListener("input", () => { loc.title = titleIn.value; });
        // Route assignment
        if (this.tracks.length > 1) {
          const routeSelect = item.createEl("select", { cls: "hj-loc-route-select" });
          for (const track of this.tracks) {
            const opt = routeSelect.createEl("option", { value: track.id, text: track.name || track.fileName });
            if (loc.routeId === track.id) opt.selected = true;
          }
          routeSelect.addEventListener("change", () => { loc.routeId = routeSelect.value; });
        }
        item.createEl("span", {
          text: `(${loc.lat?.toFixed(4)}, ${loc.lng?.toFixed(4)})`,
          cls: "hj-loc-coords"
        });
        const geminiKeyManual = this.settings && this.settings.geminiApiKey || "";
        if (geminiKeyManual) {
          const enrichBtnM = item.createEl("button", { text: "AI Info", cls: "hj-btn-secondary hj-btn-sm" });
          enrichBtnM.title = "Get historical and travel information from AI for this location";
          enrichBtnM.addEventListener("click", async () => {
            enrichBtnM.disabled = true; enrichBtnM.setText("Loading...");
            const info = await enrichLocationWithGemini(loc.lat, loc.lng, loc.title, geminiKeyManual, this.settings && this.settings.geminiModel);
            enrichBtnM.disabled = false; enrichBtnM.setText("AI Info");
            if (info.description) {
              loc.description = info.description;
              if (info.highlights && info.highlights.length) {
                loc.description += "\n\nHighlights:\n" + info.highlights.map(function(h) { return "- " + h; }).join("\n");
              }
              new import_obsidian4.Notice("AI info added for: " + loc.title);
            } else {
              new import_obsidian4.Notice("Could not get AI info for this location");
            }
          });
        }
        const delBtn = item.createEl("button", { text: "\u2715", cls: "hj-btn-icon-sm hj-btn-danger" });
        delBtn.addEventListener("click", () => {
          this.locations = this.locations.filter((l) => l.id !== loc.id);
          renderLocList();
          if (this._refreshMapMarkers) this._refreshMapMarkers();
        });
      }
    };
    renderLocList();
    addLocBtn.addEventListener("click", () => {
      this.locationCounter++;
      this.locations.push({
        id: `loc-${this.locationCounter}`,
        routeId: this.tracks.length > 0 ? this.tracks[0].id : "",
        lat: 0, lng: 0, alt: void 0,
        title: `Location ${this.locationCounter}`,
        description: "", blog: "", photos: [],
        gpsSource: "manual",
        sortOrder: this.locations.length
      });
      renderLocList();
    });
    autoLocBtn.addEventListener("click", () => {
      // Auto-generate equidistant stops from tracks
      this.locations = [];
      this.locationCounter = 0;
      for (const track of this.tracks) {
        const pts = track.result.trackPoints;
        if (pts.length < 2) continue;
        const numStops = Math.min(8, Math.max(2, Math.floor(track.result.totalDistanceKm / 3)));
        const step = Math.max(1, Math.floor(pts.length / numStops));
        for (let i = 0; i < pts.length; i += step) {
          this.locationCounter++;
          this.locations.push({
            id: `loc-${this.locationCounter}`,
            routeId: track.id,
            lat: Math.round(pts[i].lat * 1e6) / 1e6,
            lng: Math.round(pts[i].lng * 1e6) / 1e6,
            alt: pts[i].ele,
            title: `${track.name || "Route"} - Stop ${this.locationCounter}`,
            description: "", blog: "", photos: [],
            gpsSource: "gpx",
            sortOrder: this.locationCounter - 1
          });
        }
        // Always add last point
        const last = pts[pts.length - 1];
        if (this.locations.length === 0 || this.locations[this.locations.length - 1].lat !== last.lat) {
          this.locationCounter++;
          this.locations.push({
            id: `loc-${this.locationCounter}`,
            routeId: track.id,
            lat: Math.round(last.lat * 1e6) / 1e6,
            lng: Math.round(last.lng * 1e6) / 1e6,
            alt: last.ele,
            title: `${track.name || "Route"} - End`,
            description: "", blog: "", photos: [],
            gpsSource: "gpx",
            sortOrder: this.locationCounter - 1
          });
        }
      }
      renderLocList();
      if (this._refreshMapMarkers) this._refreshMapMarkers();
      new import_obsidian4.Notice(`Generated ${this.locations.length} location stops`);
    });
  }
  // AI-Assisted location mode
  renderStep2AiMode(el, geminiKey) {
    el.createEl("p", {
      text: "Upload all your photos. Gemini will analyze each photo to suggest geographic locations. Review and adjust the results before continuing.",
      cls: "hj-wizard-hint"
    });
    const uploadSection = el.createDiv({ cls: "hj-ai-upload-section" });
    uploadSection.style.cssText = "border:2px dashed var(--background-modifier-border);border-radius:8px;padding:16px;margin-bottom:12px;";
    uploadSection.createEl("h4", { text: "Upload Photos for AI Analysis" });
    const dropZone2 = uploadSection.createDiv({ cls: "hj-drop-zone" });
    dropZone2.createEl("div", { text: "", cls: "hj-drop-icon" });
    dropZone2.createEl("div", { text: "Drop all your trip photos here or click to browse" });
    dropZone2.createEl("div", { text: "AI will analyze each photo to identify its location", cls: "hj-drop-sub" });
    const fileInput3 = uploadSection.createEl("input", { type: "file" });
    fileInput3.accept = "image/*";
    fileInput3.multiple = true;
    fileInput3.style.display = "none";
    dropZone2.addEventListener("click", () => fileInput3.click());
    dropZone2.addEventListener("dragover", (e) => { e.preventDefault(); dropZone2.addClass("hj-drop-active"); });
    dropZone2.addEventListener("dragleave", () => dropZone2.removeClass("hj-drop-active"));
    const photoCountEl = uploadSection.createEl("div", { cls: "hj-ai-photo-count" });
    photoCountEl.style.cssText = "margin-top:8px;font-size:13px;color:var(--text-muted);";
    const updatePhotoCount = () => {
        const total2 = this.photos.size;
        const withGps = Array.from(this.photos.values()).filter((p) => p.exif && p.exif.hasGps).length;
        const noGps = total2 - withGps;
        if (total2 === 0) { photoCountEl.setText(""); return; }
        photoCountEl.setText(`${total2} photos ready (${withGps} have GPS — will skip AI, ${noGps} will be analyzed)`);
      };
    updatePhotoCount();
    const handleFiles2 = async (files) => { await this.importFiles(files); updatePhotoCount(); };
    dropZone2.addEventListener("drop", async (e) => {
      e.preventDefault(); dropZone2.removeClass("hj-drop-active");
      if (e.dataTransfer?.files) await handleFiles2(Array.from(e.dataTransfer.files));
    });
    fileInput3.addEventListener("change", async () => {
      if (fileInput3.files?.length) await handleFiles2(Array.from(fileInput3.files));
    });
    const analyzeRow = el.createDiv({ cls: "hj-analyze-row" });
    analyzeRow.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap;";
    const analyzeBtn = analyzeRow.createEl("button", { text: "Analyze with Gemini", cls: "hj-btn-primary" });
    // Cluster radius input
    const clusterLabel = analyzeRow.createEl("label");
    clusterLabel.style.cssText = "font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:4px;white-space:nowrap;";
    clusterLabel.createEl("span", { text: "Cluster radius:" });
    const clusterInput = clusterLabel.createEl("input", { type: "number" });
    clusterInput.value = "100";
    clusterInput.min = "0"; clusterInput.max = "5000"; clusterInput.step = "50";
    clusterInput.style.cssText = "width:60px;padding:2px 4px;border-radius:4px;border:1px solid var(--background-modifier-border);font-size:12px;";
    clusterLabel.createEl("span", { text: "m" });
    const analyzeStatus = analyzeRow.createEl("span", { cls: "hj-analyze-status" });
    analyzeStatus.style.cssText = "font-size:13px;color:var(--text-muted);";
    const reviewSection = el.createDiv({ cls: "hj-ai-review-section" });
    const selectedIds = new Set(); // persists across renderReview calls
    let savedMapView = null; // preserve map center+zoom across re-renders
    const renderReview = () => {
      reviewSection.empty();
      if (this.locations.length === 0) return;
      // Prune stale selections after location merges or deletions
      const currentLocIds = new Set(this.locations.map((l) => l.id));
      for (const sid of [...selectedIds]) { if (!currentLocIds.has(sid)) selectedIds.delete(sid); }
      reviewSection.createEl("h4", { text: `${this.locations.length} Location${this.locations.length !== 1 ? "s" : ""} Detected — Review & Edit` });
      // Controls bar: Cluster Nearby + Merge Selected
      const clusterBar = reviewSection.createDiv();
      clusterBar.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap;";
      const clusterBtn = clusterBar.createEl("button", { text: "⊤ Cluster Nearby", cls: "hj-btn-secondary hj-btn-sm" });
      clusterBtn.title = "Merge location points that are within the radius into one";
      const clusterRadiusInput = clusterBar.createEl("input", { type: "number" });
      clusterRadiusInput.value = "100"; clusterRadiusInput.min = "0"; clusterRadiusInput.max = "5000"; clusterRadiusInput.step = "25";
      clusterRadiusInput.style.cssText = "width:58px;padding:2px 5px;border-radius:4px;border:1px solid var(--background-modifier-border);font-size:12px;";
      clusterBar.createEl("span", { text: "m" }).style.cssText = "font-size:12px;color:var(--text-muted);";
      const clusterInfo = clusterBar.createEl("span");
      clusterInfo.style.cssText = "font-size:12px;color:var(--text-muted);margin-left:4px;";
      // Merge Selected button
      clusterBar.createEl("span", { text: "|" }).style.cssText = "color:var(--background-modifier-border);font-size:14px;";
      const mergeSelBtn = clusterBar.createEl("button", { text: "Merge Selected (0)", cls: "hj-btn-primary hj-btn-sm" });
      mergeSelBtn.disabled = true;
      const updateMergeSelBtn = () => {
        const n = selectedIds.size;
        mergeSelBtn.textContent = `Merge Selected (${n})`;
        mergeSelBtn.disabled = n < 2;
      };
      updateMergeSelBtn();
      mergeSelBtn.addEventListener("click", () => {
        if (selectedIds.size < 2) return;
        const toMerge = this.locations.filter((l) => selectedIds.has(l.id));
        const rest = this.locations.filter((l) => !selectedIds.has(l.id));
        const [merged] = clusterLocationsByDistance(toMerge, Infinity);
        selectedIds.clear();
        this.locations = [...rest, merged];
        clusterInfo.textContent = `✔ Merged ${toMerge.length} locations into 1.`;
        clusterInfo.style.color = "#10b981";
        renderReview();
      });
      clusterBtn.addEventListener("click", () => {
        const threshKm = (parseFloat(clusterRadiusInput.value) || 100) / 1000;
        const before = this.locations.length;
        this.locations = clusterLocationsByDistance(this.locations, threshKm);
        const merged = before - this.locations.length;
        if (merged > 0) {
          clusterInfo.textContent = `✔ Merged ${merged} point${merged !== 1 ? "s" : ""} → ${this.locations.length} location${this.locations.length !== 1 ? "s" : ""}.`;
          clusterInfo.style.color = "#10b981";
        } else {
          clusterInfo.textContent = "No points close enough to cluster.";
          clusterInfo.style.color = "var(--text-muted)";
        }
        renderReview();
      });
      const splitEl = reviewSection.createDiv();
      splitEl.style.cssText = "display:flex;gap:12px;align-items:flex-start;";
      // -- Map column --
      const mapCol = splitEl.createDiv();
      mapCol.style.cssText = "flex:1;min-width:0;";
      const markerRefs = {};
      const mapWrap2 = mapCol.createDiv({ cls: "hj-wizard-map-wrap" });
      mapWrap2.style.cssText = "height:380px;border-radius:8px;overflow:hidden;border:1px solid var(--background-modifier-border);";
      setTimeout(() => {
        if (!mapWrap2.isConnected) return;
        const wizMap2 = L2.map(mapWrap2, { zoomControl: true, attributionControl: false });
        L2.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(wizMap2);
        const allPts2 = [];
        const routeColors2 = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
        for (let ti = 0; ti < this.tracks.length; ti++) {
          const pts2 = this.tracks[ti].result.trackPoints;
          const step2 = Math.max(1, Math.floor(pts2.length / 300));
          const latLngs2 = [];
          for (let i2 = 0; i2 < pts2.length; i2 += step2) { latLngs2.push([pts2[i2].lat, pts2[i2].lng]); allPts2.push([pts2[i2].lat, pts2[i2].lng]); }
          L2.polyline(latLngs2, { color: routeColors2[ti % routeColors2.length], weight: 5, opacity: 0.8, interactive: false }).addTo(wizMap2);
        }
        for (const locM of this.locations) {
          if (!locM.lat || !locM.lng) continue;
          allPts2.push([locM.lat, locM.lng]);
          const srcM = locM.gpsSource || "";
          const colM = srcM === "exif" ? "#2563eb" : srcM.includes("high") ? "#10b981" : srcM.includes("medium") ? "#f59e0b" : "#6b7280";
          const iconM = L2.divIcon({
            className: "",
            html: `<div style="background:${colM};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:grab;"></div>`,
            iconSize: [14, 14], iconAnchor: [7, 7]
          });
          const marker = L2.marker([locM.lat, locM.lng], { draggable: true, icon: iconM }).addTo(wizMap2);
          marker.bindTooltip(locM.title, { permanent: false });
          markerRefs[locM.id] = marker;
          let dragRaf = null;
          marker.on("drag", (eM) => {
            const ll = eM.target.getLatLng();
            locM.lat = Math.round(ll.lat * 1e6) / 1e6;
            locM.lng = Math.round(ll.lng * 1e6) / 1e6;
            if (dragRaf) return;
            dragRaf = requestAnimationFrame(() => {
              dragRaf = null;
              const refs = inputRefs[locM.id];
              if (refs) { refs.latIn.value = String(locM.lat); refs.lngIn.value = String(locM.lng); }
            });
          });
          marker.on("dragend", async () => {
            if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = null; }
            const refs = inputRefs[locM.id];
            if (refs) { refs.latIn.value = String(locM.lat); refs.lngIn.value = String(locM.lng); }
            if (!geminiKey || !refs || !refs.titleIn) return;
            refs.titleIn.style.opacity = "0.45";
            refs.titleIn.style.borderColor = "#3b82f6";
            const newName = await nameLocationWithGemini(locM.lat, locM.lng, geminiKey, this.settings && this.settings.geminiModel);
            refs.titleIn.style.opacity = "";
            refs.titleIn.style.borderColor = "";
            if (newName) {
              locM.title = newName;
              refs.titleIn.value = newName;
              marker.setTooltipContent(newName);
            }
          });
          marker.on("mouseover", () => {
            const refs = inputRefs[locM.id];
            if (refs && refs.item) {
              refs.item.style.outline = "2px solid #3b82f6";
              refs.item.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.2)";
              refs.item.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
            if (locM.photos.length > 0) {
              let html2 = `<div style="font-weight:600;margin-bottom:5px;font-size:12px;">${locM.title}</div><div style="display:flex;gap:3px;flex-wrap:wrap;">`;
              const blobUrls = [];
              for (const pRef of locM.photos.slice(0, 4)) {
                const buf2 = this.photoBuffers.get(pRef.id);
                if (buf2) {
                  const u = URL.createObjectURL(new Blob([buf2]));
                  blobUrls.push(u);
                  html2 += `<img src="${u}" style="width:54px;height:54px;object-fit:cover;border-radius:4px;">`;
                }
              }
              html2 += `</div>`;
              if (blobUrls.length) {
                marker._hjBlobUrls = blobUrls;
                marker.bindPopup(html2, { autoPan: false, closeButton: false, className: "hj-photo-popup" }).openPopup();
              }
            }
          });
          marker.on("mouseout", () => {
            const refs = inputRefs[locM.id];
            if (refs && refs.item) { refs.item.style.outline = ""; refs.item.style.boxShadow = ""; }
            if (marker._hjBlobUrls) { marker._hjBlobUrls.forEach((u) => URL.revokeObjectURL(u)); marker._hjBlobUrls = []; }
            marker.closePopup();
          });
        }
        if (savedMapView) {
          wizMap2.setView(savedMapView.center, savedMapView.zoom, { animate: false });
        } else if (allPts2.length > 0) {
          wizMap2.fitBounds(allPts2, { padding: [30, 30] });
        }
        wizMap2.on("moveend zoomend", () => {
          savedMapView = { center: wizMap2.getCenter(), zoom: wizMap2.getZoom() };
        });
        // Click on map to add new location point, then AI-name it
        wizMap2.on("click", async (eClick) => {
          const lat2 = Math.round(eClick.latlng.lat * 1e6) / 1e6;
          const lng2 = Math.round(eClick.latlng.lng * 1e6) / 1e6;
          this.locationCounter++;
          const clickLoc = {
            id: `loc-${this.locationCounter}`, routeId: this.tracks.length > 0 ? this.tracks[0].id : "",
            lat: lat2, lng: lng2, alt: void 0, title: `Location ${this.locationCounter}`,
            description: "", blog: "", photos: [], gpsSource: "manual", sortOrder: this.locations.length
          };
          this.locations.push(clickLoc);
          renderReview();
          if (geminiKey) {
            const aiName = await nameLocationWithGemini(lat2, lng2, geminiKey, this.settings && this.settings.geminiModel);
            if (aiName) { clickLoc.title = aiName; renderReview(); }
          }
        });
      }, 100);
      // -- List column --
      const listCol = splitEl.createDiv();
      listCol.style.cssText = "flex:1;min-width:0;max-height:380px;overflow-y:auto;";
      const inputRefs = {};
      for (const loc of this.locations) {
        const item = listCol.createDiv({ cls: "hj-location-item" });
        item.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;margin-bottom:6px;background:var(--background-secondary);border-radius:6px;";
        const src = loc.gpsSource || "";
        const badgeColor = src === "exif" ? "#2563eb" : src.includes("high") ? "#10b981" : src.includes("medium") ? "#f59e0b" : src.includes("unknown") ? "#6b7280" : "#3b82f6";
        // Selection checkbox
        const selCb = item.createEl("input", { type: "checkbox" });
        selCb.style.cssText = "flex-shrink:0;width:15px;height:15px;cursor:pointer;accent-color:#3b82f6;";
        selCb.checked = selectedIds.has(loc.id);
        if (selCb.checked) item.style.outline = "2px solid #3b82f6";
        selCb.addEventListener("change", () => {
          if (selCb.checked) {
            selectedIds.add(loc.id);
            item.style.outline = "2px solid #3b82f6";
            const mkr2 = markerRefs[loc.id];
            if (mkr2) mkr2.setIcon(L2.divIcon({ className: "", html: `<div style="background:${badgeColor};width:14px;height:14px;border-radius:50%;border:3px solid #f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.5);cursor:grab;"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] }));
          } else {
            selectedIds.delete(loc.id);
            item.style.outline = "";
            const mkr2 = markerRefs[loc.id];
            if (mkr2) mkr2.setIcon(L2.divIcon({ className: "", html: `<div style="background:${badgeColor};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:grab;"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] }));
          }
          updateMergeSelBtn();
        });
        const badge = item.createEl("span");
        badge.style.cssText = `background:${badgeColor};color:#fff;font-size:11px;padding:2px 6px;border-radius:10px;white-space:nowrap;flex-shrink:0;`;
        badge.setText(src === "exif" ? "GPS" : src.includes("high") ? "High" : src.includes("medium") ? "Mid" : src.includes("unknown") ? "?" : "Manual");
        const titleIn = item.createEl("input", { type: "text", cls: "hj-wizard-input hj-loc-title", value: loc.title, placeholder: "Location name" });
        titleIn.style.cssText = "flex:1;min-width:80px;";
        titleIn.addEventListener("input", () => {
          loc.title = titleIn.value;
          if (markerRefs[loc.id]) markerRefs[loc.id].setTooltipContent(loc.title);
        });
        const coordRow = item.createDiv();
        coordRow.style.cssText = "display:flex;gap:4px;align-items:center;width:100%;";
        const latIn = coordRow.createEl("input", { type: "number", placeholder: "Lat", cls: "hj-wizard-input" });
        latIn.value = loc.lat ? String(loc.lat) : "";
        latIn.style.cssText = "flex:1;min-width:0;";
        latIn.addEventListener("change", () => {
          loc.lat = parseFloat(latIn.value) || 0;
          if (markerRefs[loc.id]) markerRefs[loc.id].setLatLng([loc.lat, loc.lng]);
        });
        const lngIn = coordRow.createEl("input", { type: "number", placeholder: "Lng", cls: "hj-wizard-input" });
        lngIn.value = loc.lng ? String(loc.lng) : "";
        lngIn.style.cssText = "flex:1;min-width:0;";
        lngIn.addEventListener("change", () => {
          loc.lng = parseFloat(lngIn.value) || 0;
          if (markerRefs[loc.id]) markerRefs[loc.id].setLatLng([loc.lat, loc.lng]);
        });
        inputRefs[loc.id] = { latIn, lngIn, item, titleIn };
        item.createEl("span", { text: `${loc.photos.length} photo${loc.photos.length !== 1 ? "s" : ""}`, cls: "hj-loc-coords" });
        if (geminiKey) {
          const enrichBtn = item.createEl("button", { text: "AI Info", cls: "hj-btn-secondary hj-btn-sm" });
          enrichBtn.title = "Get historical and travel information from AI for this location";
          enrichBtn.addEventListener("click", async () => {
            enrichBtn.disabled = true; enrichBtn.setText("Loading...");
            const info = await enrichLocationWithGemini(loc.lat, loc.lng, loc.title, geminiKey, this.settings && this.settings.geminiModel);
            enrichBtn.disabled = false; enrichBtn.setText("AI Info");
            if (info.description) {
              loc.description = info.description;
              if (info.highlights && info.highlights.length) {
                loc.description += "\n\nHighlights:\n" + info.highlights.map((h) => "- " + h).join("\n");
              }
              new import_obsidian4.Notice("AI info added for: " + loc.title);
              let infoEl = item.querySelector(".hj-loc-ai-info");
              if (!infoEl) {
                infoEl = item.createDiv({ cls: "hj-loc-ai-info" });
                infoEl.style.cssText = "width:100%;font-size:12px;color:var(--text-muted);padding:6px 0 2px 0;border-top:1px solid var(--background-modifier-border);margin-top:4px;";
              }
              infoEl.setText(info.description);
            } else {
              new import_obsidian4.Notice("Could not get AI info for this location");
            }
          });
        }
        const delBtn = item.createEl("button", { text: "x", cls: "hj-btn-icon-sm hj-btn-danger" });
        delBtn.addEventListener("click", () => {
          this.locations = this.locations.filter((l) => l.id !== loc.id);
          renderReview();
        });
      }
      const addBtn = listCol.createEl("button", { text: "+ Add Location Manually", cls: "hj-btn-secondary hj-btn-sm" });
      addBtn.style.marginTop = "6px";
      addBtn.addEventListener("click", () => {
        this.locationCounter++;
        this.locations.push({
          id: `loc-${this.locationCounter}`, routeId: this.tracks.length > 0 ? this.tracks[0].id : "",
          lat: 0, lng: 0, alt: void 0, title: `Location ${this.locationCounter}`,
          description: "", blog: "", photos: [], gpsSource: "manual", sortOrder: this.locations.length
        });
        renderReview();
      });
    };
    analyzeBtn.addEventListener("click", async () => {
      if (this.photos.size === 0) { new import_obsidian4.Notice("Please upload photos first"); return; }
      analyzeBtn.disabled = true;
      this.locations = [];
      this.locationCounter = 0;
      this.aiAnalysisResults = [];
      const total = this.photos.size;
      let done = 0;
      const locationMap = new Map();
      // Build route bounding box for geographic constraint
      let routeContext = null;
      const allTp = this.tracks.flatMap((t) => t.result && t.result.trackPoints || []);
      if (allTp.length) {
        const lats = allTp.map((p) => p.lat), lngs = allTp.map((p) => p.lng);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
        routeContext = {
          minLat, maxLat, minLng, maxLng,
          centerLat: (minLat + maxLat) / 2,
          centerLng: (minLng + maxLng) / 2,
          region: this.config && this.config.region || ""
        };
      }
      for (const [id, photo] of this.photos) {
        const buf = this.photoBuffers.get(id);
        if (!buf) { done++; continue; }
        let result, groupKey;
        if (photo.exif && photo.exif.hasGps) {
          // Has EXIF GPS — skip Gemini, use exact coordinates
          analyzeStatus.setText(`${done + 1}/${total}: ${photo.filename} (GPS — skipped)`);
          const rLat = Math.round(photo.exif.lat * 1000) / 1000;
          const rLng = Math.round(photo.exif.lng * 1000) / 1000;
          groupKey = `exif:${rLat},${rLng}`;
          result = { lat: photo.exif.lat, lng: photo.exif.lng, locationName: groupKey, confidence: "high", reasoning: "EXIF GPS" };
        } else {
          // No GPS — send to Gemini with route geographic constraint
          analyzeStatus.setText(`${done + 1}/${total}: ${photo.filename} (analyzing...)`);
          result = await analyzePhotoWithGemini(buf, geminiKey, this.settings && this.settings.geminiModel, routeContext);
          groupKey = (result.locationName || "Unknown").trim();
        }
        this.aiAnalysisResults.push({ photoId: id, ...result });
        if (!locationMap.has(groupKey)) {
          this.locationCounter++;
          const isExif = groupKey.startsWith("exif:");
          const newLoc = {
            id: `loc-${this.locationCounter}`,
            routeId: this.tracks.length > 0 ? this.tracks[0].id : "",
            lat: result.lat ?? 0, lng: result.lng ?? 0, alt: void 0,
            title: isExif ? `Location (${result.lat?.toFixed(4)}, ${result.lng?.toFixed(4)})` : groupKey,
            description: "", blog: "", photos: [],
            gpsSource: isExif ? "exif" : (result.lat ? `ai-${result.confidence}` : "ai-unknown"),
            sortOrder: this.locationCounter - 1
          };
          this.locations.push(newLoc);
          locationMap.set(groupKey, newLoc);
        }
        const loc = locationMap.get(groupKey);
        loc.photos.push({ id: photo.id, filename: photo.filename, vaultPath: "", title: photo.title, sortOrder: loc.photos.length });
        if (result.lat && !loc.lat) { loc.lat = result.lat; loc.lng = result.lng; }
        done++;
      }
      const exifUsed = this.locations.filter((l) => l.gpsSource === "exif").length;
      const aiUsed = this.locations.length - exifUsed;
      // Use Gemini to name GPS locations by reverse-geocoding their coordinates
      const exifLocs = this.locations.filter((l) => l.gpsSource === "exif");
      if (exifLocs.length > 0 && geminiKey) {
        let namedCount = 0;
        for (const exifLoc of exifLocs) {
          analyzeStatus.setText(`Naming GPS location ${++namedCount}/${exifLocs.length}: (${exifLoc.lat}, ${exifLoc.lng})...`);
          const aiName = await nameLocationWithGemini(exifLoc.lat, exifLoc.lng, geminiKey, this.settings && this.settings.geminiModel);
          if (aiName) exifLoc.title = aiName;
        }
      }
      // Cluster nearby locations
      const clusterThresholdKm = (parseFloat(clusterInput.value) || 100) / 1000;
      const beforeCluster = this.locations.length;
      this.locations = clusterLocationsByDistance(this.locations, clusterThresholdKm);
      const mergedCount = beforeCluster - this.locations.length;
      const clusterNote = mergedCount > 0 ? ` Merged ${mergedCount} nearby point${mergedCount !== 1 ? "s" : ""} \u2192 ${this.locations.length} location${this.locations.length !== 1 ? "s" : ""}.` : "";
      analyzeStatus.setText(`Done! ${beforeCluster} detected (${exifUsed} GPS, ${aiUsed} AI).${clusterNote}`);
      analyzeBtn.disabled = false;
      renderReview();
    });
    renderReview();
  }

  // Editable location list with AI enrichment button
  renderAiLocationList(container, geminiKey, onRefresh) {
    container.empty();
    for (const loc of this.locations) {
      const item = container.createDiv({ cls: "hj-location-item" });
      item.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;margin-bottom:6px;background:var(--background-secondary);border-radius:6px;";
      const src = loc.gpsSource || "";
      const badgeColor = src.includes("high") ? "#10b981" : src.includes("medium") ? "#f59e0b" : src.includes("unknown") ? "#6b7280" : "#3b82f6";
      const badge = item.createEl("span");
      badge.style.cssText = `background:${badgeColor};color:#fff;font-size:11px;padding:2px 6px;border-radius:10px;white-space:nowrap;`;
      badge.setText(src.includes("high") ? "High" : src.includes("medium") ? "Mid" : src.includes("unknown") ? "? Unknown" : "Manual");
      const titleIn = item.createEl("input", { type: "text", cls: "hj-wizard-input hj-loc-title", value: loc.title, placeholder: "Location name" });
      titleIn.style.flex = "1";
      titleIn.addEventListener("input", () => { loc.title = titleIn.value; });
      const latIn = item.createEl("input", { type: "number", placeholder: "Lat", cls: "hj-wizard-input" });
      latIn.value = loc.lat ? String(loc.lat) : "";
      latIn.style.cssText = "width:88px;";
      latIn.addEventListener("change", () => { loc.lat = parseFloat(latIn.value) || 0; });
      const lngIn = item.createEl("input", { type: "number", placeholder: "Lng", cls: "hj-wizard-input" });
      lngIn.value = loc.lng ? String(loc.lng) : "";
      lngIn.style.cssText = "width:88px;";
      lngIn.addEventListener("change", () => { loc.lng = parseFloat(lngIn.value) || 0; });
      item.createEl("span", { text: `${loc.photos.length} photos`, cls: "hj-loc-coords" });
      if (geminiKey) {
        const enrichBtn = item.createEl("button", { text: "AI Info", cls: "hj-btn-secondary hj-btn-sm" });
        enrichBtn.title = "Get historical and travel information from AI for this location";
        enrichBtn.addEventListener("click", async () => {
          enrichBtn.disabled = true; enrichBtn.setText("Loading...");
          const info = await enrichLocationWithGemini(loc.lat, loc.lng, loc.title, geminiKey, this.settings && this.settings.geminiModel);
          enrichBtn.disabled = false; enrichBtn.setText("AI Info");
          if (info.description) {
            loc.description = info.description;
            if (info.highlights && info.highlights.length) {
              loc.description += "\n\nHighlights:\n" + info.highlights.map((h) => "- " + h).join("\n");
            }
            new import_obsidian4.Notice("AI info added for: " + loc.title);
            let infoEl = item.querySelector(".hj-loc-ai-info");
            if (!infoEl) {
              infoEl = item.createDiv({ cls: "hj-loc-ai-info" });
              infoEl.style.cssText = "width:100%;font-size:12px;color:var(--text-muted);padding:6px 0 2px 0;border-top:1px solid var(--background-modifier-border);margin-top:4px;";
            }
            infoEl.setText(info.description);
          } else {
            new import_obsidian4.Notice("Could not get AI info for this location");
          }
        });
      }
      const delBtn = item.createEl("button", { text: "x", cls: "hj-btn-icon-sm hj-btn-danger" });
      delBtn.addEventListener("click", () => {
        this.locations = this.locations.filter((l) => l.id !== loc.id);
        if (onRefresh) onRefresh();
      });
    }
    const addBtn = container.createEl("button", { text: "+ Add Location Manually", cls: "hj-btn-secondary hj-btn-sm" });
    addBtn.style.marginTop = "6px";
    addBtn.addEventListener("click", () => {
      this.locationCounter++;
      this.locations.push({
        id: `loc-${this.locationCounter}`, routeId: this.tracks.length > 0 ? this.tracks[0].id : "",
        lat: 0, lng: 0, alt: void 0, title: `Location ${this.locationCounter}`,
        description: "", blog: "", photos: [], gpsSource: "manual", sortOrder: this.locations.length
      });
      if (onRefresh) onRefresh();
    });
  }


  // ==============================
  // Step 3: Upload Photos Per Location
  // ==============================
  renderStep3Photos() {
    const el = this.contentEl;
    el.createEl("h2", { text: "Step 3: Photos" });
    el.createEl("p", { text: "Upload photos then drag them into location pools. Click a location or map pin to select it.", cls: "hj-wizard-hint" });

    // ---- Upload zone ----
    const uploadWrap = el.createDiv({ cls: "hj-wizard-field" });
    const uploadDrop = uploadWrap.createDiv({ cls: "hj-drop-zone hj-drop-sm" });
    uploadDrop.createEl("div", { text: "Drop photos here or click to browse", cls: "hj-drop-icon" });
    uploadDrop.createEl("div", { text: "New photos are added to the Unassigned pool", cls: "hj-drop-sub" });
    const fileInput3 = uploadWrap.createEl("input", { type: "file" });
    fileInput3.accept = "image/*"; fileInput3.multiple = true; fileInput3.style.display = "none";
    uploadDrop.addEventListener("click", () => fileInput3.click());
    uploadDrop.addEventListener("dragover", (e) => { e.preventDefault(); uploadDrop.addClass("hj-drop-active"); });
    uploadDrop.addEventListener("dragleave", () => uploadDrop.removeClass("hj-drop-active"));
    const doUpload = async (files) => { await this.importFiles(files); renderAllRows(); };
    uploadDrop.addEventListener("drop", async (e) => { e.preventDefault(); uploadDrop.removeClass("hj-drop-active"); if (e.dataTransfer && e.dataTransfer.files) await doUpload(Array.from(e.dataTransfer.files)); });
    fileInput3.addEventListener("change", async () => { if (fileInput3.files && fileInput3.files.length) await doUpload(Array.from(fileInput3.files)); });

    // ---- Map ----
    const mapWrap3 = el.createDiv({ cls: "hj-wizard-map-wrap" });
    mapWrap3.style.cssText = "height:260px;margin-bottom:0;border-radius:8px 8px 0 0;overflow:hidden;border:1px solid var(--background-modifier-border);border-bottom:none;";
    let map3Ref = null;
    const mapMarkers3 = {};
    const markerRowRefs = {};
    setTimeout(() => {
      if (!mapWrap3.isConnected) return;
      map3Ref = L2.map(mapWrap3, { zoomControl: true, attributionControl: false });
      L2.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(map3Ref);
      const allPts3 = [];
      const rc3 = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
      for (let ti3 = 0; ti3 < this.tracks.length; ti3++) {
        const tpts = this.tracks[ti3].result.trackPoints;
        const tstp = Math.max(1, Math.floor(tpts.length / 300));
        const tll = [];
        for (let ii = 0; ii < tpts.length; ii += tstp) { tll.push([tpts[ii].lat, tpts[ii].lng]); allPts3.push([tpts[ii].lat, tpts[ii].lng]); }
        L2.polyline(tll, { color: rc3[ti3 % rc3.length], weight: 5, opacity: 0.8, interactive: false }).addTo(map3Ref);
      }
      for (const loc3 of this.locations) {
        if (!loc3.lat || !loc3.lng) continue;
        allPts3.push([loc3.lat, loc3.lng]);
        const mkIcon = (selected) => L2.divIcon({
          className: "",
          html: `<div style="background:${selected ? "#2563eb" : "#ef4444"};width:${selected ? 16 : 12}px;height:${selected ? 16 : 12}px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;transition:all 0.15s;"></div>`,
          iconSize: [selected ? 16 : 12, selected ? 16 : 12], iconAnchor: [selected ? 8 : 6, selected ? 8 : 6]
        });
        const mk3 = L2.marker([loc3.lat, loc3.lng], { icon: mkIcon(this.selectedLocationId === loc3.id) }).addTo(map3Ref);
        mk3.bindTooltip(loc3.title, { permanent: false });
        mapMarkers3[loc3.id] = { marker: mk3, mkIcon };
        mk3.on("click", () => {
          this.selectedLocationId = loc3.id;
          renderAllRows();
          const rowEl = markerRowRefs[loc3.id];
          if (rowEl) rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
      if (allPts3.length > 0) map3Ref.fitBounds(allPts3, { padding: [20, 20] });
    }, 100);

    // ---- Location + Photo rows ----
    const rowsContainer = el.createDiv();
    rowsContainer.style.cssText = "border:1px solid var(--background-modifier-border);border-radius:0 0 8px 8px;overflow:hidden;margin-bottom:12px;max-height:380px;overflow-y:auto;";

    const renderAllRows = () => {
      rowsContainer.empty();
      Object.keys(markerRowRefs).forEach((k) => delete markerRowRefs[k]);
      // Update map marker icons to reflect selection
      for (const [locId, ref] of Object.entries(mapMarkers3)) {
        ref.marker.setIcon(ref.mkIcon(this.selectedLocationId === locId));
      }
      // Build set of assigned photo IDs
      const assignedIds = new Set();
      for (const l3 of this.locations) for (const p3 of l3.photos) assignedIds.add(p3.id);
      // Rows: each location + an "Unassigned" row at the bottom
      const rows3 = [...this.locations, { id: "unassigned", title: "Unassigned", lat: 0, lng: 0, photos: [] }];
      for (let ri = 0; ri < rows3.length; ri++) {
        const rl = rows3[ri];
        const isSel = this.selectedLocationId === rl.id;
        const isLast = ri === rows3.length - 1;
        const row = rowsContainer.createDiv();
        row.style.cssText = `display:flex;align-items:stretch;${isLast ? "" : "border-bottom:1px solid var(--background-modifier-border);"}${isSel ? "background:#eff6ff;" : ""}`;
        if (rl.id !== "unassigned") markerRowRefs[rl.id] = row;
        // Left cell: location name
        const nameCell = row.createDiv();
        nameCell.style.cssText = `width:160px;flex-shrink:0;padding:10px 12px;cursor:pointer;border-right:1px solid var(--background-modifier-border);display:flex;flex-direction:column;justify-content:center;gap:3px;${isSel ? "font-weight:600;color:#2563eb;" : ""}`;
        const photosInRow = rl.id === "unassigned"
          ? Array.from(this.photos.values()).filter((p3) => !assignedIds.has(p3.id))
          : rl.photos.map((p3) => this.photos.get(p3.id)).filter(Boolean);
        nameCell.createEl("span", { text: rl.title, cls: "hj-loc-select-name" });
        nameCell.createEl("span", { text: `${photosInRow.length} photo${photosInRow.length !== 1 ? "s" : ""}`, cls: "hj-loc-select-count" });
        nameCell.addEventListener("click", () => {
          this.selectedLocationId = rl.id;
          renderAllRows();
          if (rl.id !== "unassigned" && map3Ref && rl.lat && rl.lng) {
            map3Ref.flyTo([rl.lat, rl.lng], 15, { animate: true, duration: 0.5 });
          }
        });
        // Right cell: photo pool (drag-and-drop target)
        const pool = row.createDiv();
        pool.style.cssText = "flex:1;min-height:88px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start;";
        pool.addEventListener("dragover", (e) => { e.preventDefault(); pool.style.background = "rgba(59,130,246,0.08)"; });
        pool.addEventListener("dragleave", () => { pool.style.background = ""; });
        pool.addEventListener("drop", (e) => {
          e.preventDefault(); pool.style.background = "";
          const pid = e.dataTransfer.getData("text/photo-id");
          const fromId = e.dataTransfer.getData("text/from-loc-id");
          if (!pid || fromId === rl.id) return;
          const ph = this.photos.get(pid);
          if (!ph) return;
          // Remove from source
          if (fromId !== "unassigned") {
            const src = this.locations.find((l3) => l3.id === fromId);
            if (src) src.photos = src.photos.filter((p3) => p3.id !== pid);
          }
          // Add to target (unless unassigned)
          if (rl.id !== "unassigned") {
            const tgt = this.locations.find((l3) => l3.id === rl.id);
            if (tgt && !tgt.photos.some((p3) => p3.id === pid)) {
              tgt.photos.push({ id: ph.id, filename: ph.filename, vaultPath: "", title: ph.title, sortOrder: tgt.photos.length });
            }
          }
          renderAllRows();
        });
        // Photo thumbnails
        for (const ph of photosInRow) {
          const card = pool.createDiv();
          card.style.cssText = "position:relative;width:72px;height:72px;border-radius:6px;overflow:hidden;cursor:grab;flex-shrink:0;box-shadow:0 1px 3px rgba(0,0,0,0.15);";
          card.draggable = true;
          card.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/photo-id", ph.id);
            e.dataTransfer.setData("text/from-loc-id", rl.id);
            card.style.opacity = "0.45";
          });
          card.addEventListener("dragend", () => { card.style.opacity = ""; });
          const buf3 = this.photoBuffers.get(ph.id);
          if (buf3) {
            const img3 = card.createEl("img");
            img3.style.cssText = "width:100%;height:100%;object-fit:cover;pointer-events:none;";
            const u3 = URL.createObjectURL(new Blob([buf3]));
            img3.src = u3;
            img3.addEventListener("load", () => URL.revokeObjectURL(u3));
          } else if (ph.imageUrl) {
            const img3 = card.createEl("img");
            img3.style.cssText = "width:100%;height:100%;object-fit:cover;pointer-events:none;";
            img3.src = ph.imageUrl;
          }
          card.createEl("span", { text: ph.filename || ph.title || "", cls: "hj-photo-name-overlay" });
          const remBtn = card.createEl("button");
          remBtn.textContent = "×";
          remBtn.style.cssText = "position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.55);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:12px;cursor:pointer;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;";
          remBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (rl.id !== "unassigned") {
              const tgt = this.locations.find((l3) => l3.id === rl.id);
              if (tgt) tgt.photos = tgt.photos.filter((p3) => p3.id !== ph.id);
            }
            this.photos.delete(ph.id);
            this.photoBuffers.delete(ph.id);
            renderAllRows();
          });
        }
        if (photosInRow.length === 0) {
          pool.createEl("span", { text: "Drop photos here", cls: "hj-empty-hint" });
        }
      }
    };
    renderAllRows();

    this.renderFooter(el, {
      backLabel: "← Back",
      onBack: () => { this.step = 2; this.renderStep(); },
      nextLabel: "Next: Edit Blog →",
      onNext: () => { this.step = 4; this.renderStep(); }
    });
  }
  // ==============================
  // Step 4: Blog Structure & Text Editor
  // ==============================
  renderStep4Structure() {
    const el = this.contentEl;
    el.createEl("h2", { text: "Step 4: Blog Sections" });
    el.createEl("p", {
      text: "Create sections for your blog, then assign locations (with their photos) into each section.",
      cls: "hj-wizard-hint"
    });
    // Auto-initialize sections on first entry
    if (this.sections.length === 0) {
      const routeIds = this.tracks.length > 0
        ? this.tracks.map((t) => t.id)
        : ["default"];
      for (const routeId of routeIds) {
        const routeLocs = this.locations.filter((l) => (l.routeId || "default") === routeId);
        if (routeLocs.length > 0) {
          const sec = {
            id: `sec-${++this.sectionCounter}`,
            routeId,
            title: "Section 1",
            locationIds: routeLocs.map((l) => l.id),
            text: ""
          };
          this.sections.push(sec);
        }
      }
    }
    const structureEl = el.createDiv({ cls: "hj-blog-structure" });
    const renderStructure = () => {
      structureEl.empty();
      // Build route groups
      const routeGroups = new Map();
      for (const track of this.tracks) {
        routeGroups.set(track.id, { name: track.name || track.fileName });
      }
      if (this.tracks.length === 0) {
        routeGroups.set("default", { name: this.config.name });
      }
      for (const [routeId, group] of routeGroups) {
        const routeBlock = structureEl.createDiv({ cls: "hj-route-block" });
        // Route header
        const routeHeader = routeBlock.createDiv({ cls: "hj-route-header" });
        routeHeader.createEl("span", { text: "##", cls: "hj-section-level" });
        const track = this.tracks.find((t) => t.id === routeId);
        const routeTitleIn = routeHeader.createEl("input", {
          type: "text", cls: "hj-section-title-input",
          value: group.name, placeholder: "Route / Day name"
        });
        routeTitleIn.addEventListener("input", () => {
          if (track) track.name = routeTitleIn.value;
          group.name = routeTitleIn.value;
        });
        // Unassigned locations pool for this route
        const allAssignedIds = new Set();
        for (const sec of this.sections) {
          if (sec.routeId === routeId) {
            for (const lid of sec.locationIds) allAssignedIds.add(lid);
          }
        }
        const routeLocs = this.locations.filter((l) => (l.routeId || "default") === routeId);
        const unassigned = routeLocs.filter((l) => !allAssignedIds.has(l.id));
        if (unassigned.length > 0) {
          const poolEl = routeBlock.createDiv({ cls: "hj-loc-pool" });
          poolEl.createEl("div", { text: "Unassigned Locations:", cls: "hj-pool-label" });
          const poolList = poolEl.createDiv({ cls: "hj-pool-list" });
          for (const loc of unassigned) {
            const chip = poolList.createDiv({ cls: "hj-loc-chip" });
            chip.createEl("span", { text: `${loc.title} (${loc.photos.length} photos)` });
          }
        }
        // Sections for this route
        const routeSections = this.sections.filter((s) => s.routeId === routeId);
        for (const sec of routeSections) {
          const secBlock = routeBlock.createDiv({ cls: "hj-section-block" });
          // Section header: title input + delete button
          const secHeader = secBlock.createDiv({ cls: "hj-section-header" });
          secHeader.createEl("span", { text: "###", cls: "hj-section-level" });
          const secTitleIn = secHeader.createEl("input", {
            type: "text", cls: "hj-section-title-input",
            value: sec.title, placeholder: "Section title"
          });
          secTitleIn.addEventListener("input", () => { sec.title = secTitleIn.value; });
          const delSecBtn = secHeader.createEl("button", { text: "\u2715", cls: "hj-btn-icon-sm", attr: { title: "Delete section" } });
          delSecBtn.addEventListener("click", () => {
            this.sections = this.sections.filter((s) => s.id !== sec.id);
            renderStructure();
          });
          // Assigned locations in this section
          if (sec.locationIds.length > 0) {
            const assignedEl = secBlock.createDiv({ cls: "hj-assigned-locs" });
            for (const locId of sec.locationIds) {
              const loc = this.locations.find((l) => l.id === locId);
              if (!loc) continue;
              const locCard = assignedEl.createDiv({ cls: "hj-assigned-loc-card" });
              // Photo thumbnails
              if (loc.photos.length > 0) {
                const thumbRow = locCard.createDiv({ cls: "hj-loc-photo-preview" });
                for (const photoRef of loc.photos.slice(0, 4)) {
                  const photo = this.photos.get(photoRef.id);
                  const buf = photo ? this.photoBuffers.get(photo.id) : null;
                  if (buf) {
                    const blob = new Blob([buf]);
                    const img = thumbRow.createEl("img", { cls: "hj-blog-thumb" });
                    img.src = URL.createObjectURL(blob);
                    img.addEventListener("load", () => URL.revokeObjectURL(img.src));
                  } else if (photo && photo.imageUrl) {
                    const img = thumbRow.createEl("img", { cls: "hj-blog-thumb" });
                    img.src = photo.imageUrl;
                  }
                }
                if (loc.photos.length > 4) {
                  thumbRow.createEl("span", { text: `+${loc.photos.length - 4}`, cls: "hj-thumb-more" });
                }
              }
              locCard.createEl("span", { text: loc.title, cls: "hj-assigned-loc-name" });
              const unassignBtn = locCard.createEl("button", { text: "\u2715", cls: "hj-btn-icon-sm", attr: { title: "Remove from section" } });
              unassignBtn.addEventListener("click", () => {
                sec.locationIds = sec.locationIds.filter((id) => id !== locId);
                renderStructure();
              });
            }
          }
          // Dropdown to assign unassigned locations
          if (unassigned.length > 0) {
            const assignRow = secBlock.createDiv({ cls: "hj-assign-row" });
            const select = assignRow.createEl("select", { cls: "hj-assign-select" });
            select.createEl("option", { text: "+ Assign location...", value: "" });
            for (const loc of unassigned) {
              select.createEl("option", { text: `${loc.title} (${loc.photos.length} photos)`, value: loc.id });
            }
            select.addEventListener("change", () => {
              if (select.value) {
                sec.locationIds.push(select.value);
                renderStructure();
              }
            });
          }
          // Blog text area
          const blogArea = secBlock.createEl("textarea", {
            cls: "hj-wizard-textarea hj-blog-textarea",
            placeholder: "Write your story for this section..."
          });
          blogArea.value = sec.text || "";
          blogArea.rows = 4;
          blogArea.addEventListener("input", () => { sec.text = blogArea.value; });
        }
        // Add section button
        const addSecBtn = routeBlock.createEl("button", { text: "+ Add Section", cls: "hj-btn-sm hj-add-section-btn" });
        addSecBtn.addEventListener("click", () => {
          this.sections.push({
            id: `sec-${++this.sectionCounter}`,
            routeId,
            title: `Section ${this.sections.filter((s) => s.routeId === routeId).length + 1}`,
            locationIds: [],
            text: ""
          });
          renderStructure();
        });
      }
    };
    renderStructure();
    this.renderFooter(el, {
      backLabel: "\u2190 Back",
      onBack: () => { this.step = 3; this.renderStep(); },
      nextLabel: "Next: Review & Generate \u2192",
      onNext: () => { this.step = 5; this.renderStep(); }
    });
  }
  // ==============================
  // Step 5: Review & Generate
  // ==============================
  renderStep5Review() {
    const el = this.contentEl;
    el.createEl("h2", { text: this.existingTripId ? "Step 5: Review & Append" : "Step 5: Review & Generate" });
    const summary = el.createDiv({ cls: "hj-wizard-summary" });
    if (this.existingTripId) {
      summary.createEl("div", { text: `Adding to journal: ${this.existingTripId}`, cls: "hj-summary-name" });
    } else {
      summary.createEl("div", { text: `${this.config.name}`, cls: "hj-summary-name" });
      const dateStr = this.config.endDate ? `${this.config.date} – ${this.config.endDate}` : this.config.date;
      summary.createEl("div", { text: `${dateStr} | ${this.config.region}` });
    }
    summary.createEl("div", { text: `${this.tracks.length} route(s) | ${this.locations.length} location(s) | ${this.photos.size} photo(s)` });
    if (this.tracks.length > 0) {
      const totalKm = this.tracks.reduce((s, t) => s + (t.result?.totalDistanceKm || 0), 0);
      summary.createEl("div", { text: `Total distance: ${totalKm.toFixed(1)} km` });
    }
    // Markdown preview toggle
    const previewToggle = el.createEl("button", { text: "Preview Markdown", cls: "hj-btn-secondary hj-btn-sm" });
    const previewEl = el.createDiv({ cls: "hj-markdown-preview" });
    previewEl.style.display = "none";
    previewToggle.addEventListener("click", () => {
      if (previewEl.style.display === "none") {
        const routes = this.tracks.map((t) => ({
          id: t.id, name: t.name, date: t.date || "", gpxFileName: t.fileName,
          stats: { distanceKm: t.result?.totalDistanceKm || 0, elevationGainM: t.result?.elevationGainM || 0, elevationLossM: t.result?.elevationLossM || 0 },
          sortOrder: this.tracks.indexOf(t)
        }));
        const md = generateJournalMarkdownV5(this.config, routes, this.locations, this.sections);
        previewEl.empty();
        previewEl.createEl("pre", { cls: "hj-preview-code" }).createEl("code", { text: md });
        previewEl.style.display = "block";
        previewToggle.setText("Hide Preview");
      } else {
        previewEl.style.display = "none";
        previewToggle.setText("Preview Markdown");
      }
    });
    // Outline
    el.createEl("h3", { text: "Structure Outline", cls: "hj-outline-title" });
    const outline = el.createDiv({ cls: "hj-outline" });
    for (const track of this.tracks) {
      const h2El = outline.createDiv({ cls: "hj-outline-h2" });
      h2El.createEl("span", { text: `## ${track.name || track.fileName}` });
      const trackLocs = this.locations.filter((l) => l.routeId === track.id);
      h2El.createEl("span", { text: ` (${trackLocs.length} locations)`, cls: "hj-outline-count" });
      for (const loc of trackLocs) {
        const h3El = outline.createDiv({ cls: "hj-outline-h3" });
        h3El.createEl("span", { text: `### ${loc.title}` });
        h3El.createEl("span", { text: ` (${loc.photos.length} photos)`, cls: "hj-outline-count" });
      }
    }
    // Output info
    el.createEl("h3", { text: "Output", cls: "hj-outline-title" });
    const outputInfo = el.createDiv({ cls: "hj-wizard-output-info" });
    outputInfo.createEl("div", { text: "Single Markdown file with all sections and photo embeds" });
    outputInfo.createEl("div", { text: "Photos copied into the trip folder alongside the .md file" });
    if (this.tracks.length > 0)
      outputInfo.createEl("div", { text: `${this.tracks.length} route file(s) included` });
    outputInfo.createEl("div", { text: "Edit the .md file directly in Obsidian to update your journal", cls: "hj-output-hint" });
    this.renderFooter(el, {
      backLabel: "\u2190 Back",
      onBack: () => { this.step = 4; this.renderStep(); },
      nextLabel: this.existingTripId ? "Append to Journal" : "Generate Journal",
      nextCls: "hj-btn-primary",
      onNext: async () => { this.existingTripId ? await this.appendToExistingJournal() : await this.generateJournalV4(); }
    });
  }
  // ==============================
  // Append to Existing Journal
  // ==============================
  async appendToExistingJournal() {
    const notice = new import_obsidian4.Notice("Appending routes...", 0);
    try {
      const newRoutes = this.tracks.map((t, i) => ({
        id: t.id,
        name: t.name || `Route ${i + 1}`,
        date: t.date || "",
        gpxFileName: t.fileName,
        gpxContent: t.content,
        stats: {
          distanceKm: t.result?.totalDistanceKm || 0,
          elevationGainM: t.result?.elevationGainM || 0,
          elevationLossM: t.result?.elevationLossM || 0
        },
        sortOrder: i
      }));
      // Sort locations by route order (same logic as generateJournalV4)
      for (const track of this.tracks) {
        const tp = track.result?.trackPoints || [];
        if (!tp.length) continue;
        const routeLocs = this.locations.filter((l) => l.routeId === track.id);
        for (const loc of routeLocs) {
          if (!loc.lat || !loc.lng) continue;
          let minD = Infinity, bestIdx = 0;
          for (let i = 0; i < tp.length; i++) {
            const d = haversineKm(loc.lat, loc.lng, tp[i].lat, tp[i].lng);
            if (d < minD) { minD = d; bestIdx = i; }
          }
          loc.sortOrder = bestIdx;
        }
      }
      await this.manager.appendRouteToJournal(this.existingTripId, newRoutes, this.locations, this.photoBuffers);
      notice.hide();
      new import_obsidian4.Notice("Routes appended successfully!");
      this.close();
      this.onComplete?.();
    } catch (err) {
      notice.hide();
      console.error("[HJ] Append failed:", err);
      new import_obsidian4.Notice(`Failed: ${err.message}`);
    }
  }
  // Legacy Step 2 (kept for backward compat, not used in new flow)
  renderStep2() {
    const el = this.contentEl;
    el.createEl("h2", { text: "\u{1F4F8} Step 2: Import Photos" });
    el.createEl("p", {
      text: "Add your photos. GPS coordinates will be automatically extracted from EXIF data.",
      cls: "hj-wizard-hint"
    });
    const statsBar = el.createDiv({ cls: "hj-wizard-stats" });
    const updateStats = () => {
      const total = this.photos.size;
      const withGps = Array.from(this.photos.values()).filter((p2) => p2.exif.hasGps).length;
      statsBar.setText(`${total} photos imported \u2022 ${withGps} with GPS \u2022 ${total - withGps} without GPS`);
    };
    updateStats();
    const dropZone = el.createDiv({ cls: "hj-drop-zone" });
    dropZone.createEl("div", { text: "\u{1F4F7}", cls: "hj-drop-icon" });
    dropZone.createEl("div", { text: "Drop photos here or click to browse" });
    dropZone.createEl("div", { text: "Supports JPG, PNG, HEIC", cls: "hj-drop-sub" });
    const fileInput = el.createEl("input", { type: "file" });
    fileInput.accept = "image/*";
    fileInput.multiple = true;
    fileInput.style.display = "none";
    dropZone.addEventListener("click", () => fileInput.click());
    dropZone.addEventListener("dragover", (e2) => {
      e2.preventDefault();
      dropZone.addClass("hj-drop-active");
    });
    dropZone.addEventListener("dragleave", () => dropZone.removeClass("hj-drop-active"));
    dropZone.addEventListener("drop", async (e2) => {
      e2.preventDefault();
      dropZone.removeClass("hj-drop-active");
      if (e2.dataTransfer?.files) {
        await this.importFiles(Array.from(e2.dataTransfer.files));
        updateStats();
        renderPhotoGrid();
      }
    });
    fileInput.addEventListener("change", async () => {
      if (fileInput.files) {
        await this.importFiles(Array.from(fileInput.files));
        updateStats();
        renderPhotoGrid();
      }
    });
    const gridContainer = el.createDiv({ cls: "hj-photo-grid-container" });
    const renderPhotoGrid = () => {
      gridContainer.empty();
      if (this.photos.size === 0) {
        gridContainer.createDiv({ text: "No photos imported yet.", cls: "hj-empty-hint" });
        return;
      }
      const grid = gridContainer.createDiv({ cls: "hj-photo-grid" });
      const sorted = Array.from(this.photos.values()).sort((a2, b2) => {
        if (a2.exif.datetime && b2.exif.datetime)
          return a2.exif.datetime.localeCompare(b2.exif.datetime);
        return a2.filename.localeCompare(b2.filename);
      });
      for (const photo of sorted) {
        const card = grid.createDiv({ cls: "hj-photo-card" });
        const thumb = card.createDiv({ cls: "hj-photo-thumb" });
        const buf = this.photoBuffers.get(photo.id);
        if (buf) {
          const blob = new Blob([buf]);
          const img = thumb.createEl("img");
          img.src = URL.createObjectURL(blob);
          img.addEventListener("load", () => URL.revokeObjectURL(img.src));
        }
        if (photo.exif.hasGps) {
          card.createDiv({ text: "\u{1F4CD} GPS", cls: "hj-photo-badge hj-badge-gps" });
        } else {
          card.createDiv({ text: "\u274C No GPS", cls: "hj-photo-badge hj-badge-nogps" });
        }
        const info = card.createDiv({ cls: "hj-photo-info" });
        info.createEl("div", { text: photo.filename, cls: "hj-photo-name" });
        if (photo.exif.datetime) {
          info.createEl("div", { text: new Date(photo.exif.datetime).toLocaleString(), cls: "hj-photo-date" });
        }
        if (photo.exif.hasGps) {
          info.createEl("div", {
            text: `${photo.exif.lat.toFixed(4)}, ${photo.exif.lng.toFixed(4)}`,
            cls: "hj-photo-coords"
          });
        }
        const removeBtn = card.createEl("button", { text: "\u2715", cls: "hj-photo-remove" });
        removeBtn.addEventListener("click", () => {
          this.photos.delete(photo.id);
          this.photoBuffers.delete(photo.id);
          updateStats();
          renderPhotoGrid();
        });
      }
    };
    renderPhotoGrid();
    this.renderFooter(el, {
      backLabel: "\u2190 Back",
      onBack: () => {
        this.step = 1;
        this.renderStep();
      },
      nextLabel: "Next: Organize Sections \u2192",
      onNext: () => {
        if (this.photos.size === 0 && !this.trackResult) {
          new import_obsidian4.Notice("Please import photos or a GPX track file");
          return;
        }
        if (this.photos.size === 0) {
          this.step = 4;
          this.renderStep();
          return;
        }
        if (this.sections.length === 0)
          this.autoCreateSections();
        this.step = 3;
        this.renderStep();
      }
    });
  }
  // ==============================
  // Step 3: Organize Sections
  // ==============================
  renderStep3() {
    const el = this.contentEl;
    el.createEl("h2", { text: "\u{1F4C2} Step 3: Organize Sections" });
    el.createEl("p", {
      text: "Create sections (H2 = major locations, H3 = sub-sections) and assign photos to each.",
      cls: "hj-wizard-hint"
    });
    const toolbar = el.createDiv({ cls: "hj-section-toolbar" });
    const addH2Btn = toolbar.createEl("button", { text: "+ Add Section (H2)", cls: "hj-btn-primary hj-btn-sm" });
    addH2Btn.addEventListener("click", () => {
      this.addSection(2);
      renderSections();
    });
    const addH3Btn = toolbar.createEl("button", { text: "+ Add Sub-section (H3)", cls: "hj-btn-secondary hj-btn-sm" });
    addH3Btn.addEventListener("click", () => {
      if (this.sections.filter((s2) => s2.level === 2).length === 0) {
        new import_obsidian4.Notice("Add a main section (H2) first");
        return;
      }
      this.addSection(3);
      renderSections();
    });
    const autoBtn = toolbar.createEl("button", { text: "\u{1F504} Auto-organize", cls: "hj-btn-secondary hj-btn-sm" });
    autoBtn.addEventListener("click", () => {
      this.autoCreateSections();
      renderSections();
    });
    const sectionsEl = el.createDiv({ cls: "hj-sections-list" });
    const renderSections = () => {
      sectionsEl.empty();
      if (this.sections.length === 0) {
        sectionsEl.createDiv({ text: 'No sections yet. Click "Add Section" or "Auto-organize" above.', cls: "hj-empty-hint" });
        return;
      }
      const h2s = this.sections.filter((s2) => s2.level === 2);
      for (const section of h2s) {
        this.renderSectionBlock(sectionsEl, section, renderSections);
        const children = this.sections.filter((s2) => s2.parentId === section.id && s2.level === 3);
        for (const child of children) {
          this.renderSectionBlock(sectionsEl, child, renderSections, true);
        }
      }
      const assignedIds = /* @__PURE__ */ new Set();
      for (const s2 of this.sections)
        for (const pid of s2.photos)
          assignedIds.add(pid);
      const unassigned = Array.from(this.photos.keys()).filter((id) => !assignedIds.has(id));
      if (unassigned.length > 0) {
        const unEl = sectionsEl.createDiv({ cls: "hj-section-unassigned" });
        unEl.createEl("h4", { text: `\u{1F4CB} Unassigned Photos (${unassigned.length})` });
        const photoList = unEl.createDiv({ cls: "hj-section-photos" });
        for (const pid of unassigned) {
          const photo = this.photos.get(pid);
          if (photo)
            this.renderMiniPhoto(photoList, photo, null, renderSections);
        }
      }
    };
    renderSections();
    this.renderFooter(el, {
      backLabel: "\u2190 Back",
      onBack: () => {
        this.step = 2;
        this.renderStep();
      },
      nextLabel: "Next: Review & Generate \u2192",
      onNext: () => {
        this.step = 4;
        this.renderStep();
      }
    });
  }
  renderSectionBlock(parent, section, refresh, isChild = false) {
    const block = parent.createDiv({ cls: `hj-section-block ${isChild ? "hj-section-child" : ""}` });
    const header = block.createDiv({ cls: "hj-section-header" });
    header.createEl("span", { text: `H${section.level}`, cls: "hj-section-level" });
    const titleInput = header.createEl("input", {
      type: "text",
      cls: "hj-section-title-input",
      value: section.title,
      placeholder: section.level === 2 ? "Major Location Name" : "Sub-section Name"
    });
    titleInput.addEventListener("input", () => {
      section.title = titleInput.value;
    });
    if (section.level === 3) {
      const parentSelect = header.createEl("select", { cls: "hj-section-parent-select" });
      for (const h2 of this.sections.filter((s2) => s2.level === 2)) {
        const opt = parentSelect.createEl("option", { value: h2.id, text: h2.title || "Untitled Section" });
        if (section.parentId === h2.id)
          opt.selected = true;
      }
      parentSelect.addEventListener("change", () => {
        section.parentId = parentSelect.value;
        refresh();
      });
    }
    const deleteBtn = header.createEl("button", { text: "\u{1F5D1}\uFE0F", cls: "hj-btn-icon-sm" });
    deleteBtn.addEventListener("click", () => {
      this.sections = this.sections.filter((s2) => s2.id !== section.id);
      if (section.level === 2)
        this.sections = this.sections.filter((s2) => s2.parentId !== section.id);
      refresh();
    });
    const photoList = block.createDiv({ cls: "hj-section-photos" });
    for (const pid of section.photos) {
      const photo = this.photos.get(pid);
      if (photo)
        this.renderMiniPhoto(photoList, photo, section.id, refresh);
    }
    block.createDiv({ cls: "hj-section-drop-hint" }).setText(`Drop photos here (${section.photos.length} photos)`);
    block.addEventListener("dragover", (e2) => {
      e2.preventDefault();
      block.addClass("hj-section-drag-over");
    });
    block.addEventListener("dragleave", () => block.removeClass("hj-section-drag-over"));
    block.addEventListener("drop", (e2) => {
      e2.preventDefault();
      block.removeClass("hj-section-drag-over");
      const photoId = e2.dataTransfer?.getData("text/plain");
      if (photoId) {
        for (const s2 of this.sections)
          s2.photos = s2.photos.filter((id) => id !== photoId);
        section.photos.push(photoId);
        refresh();
      }
    });
  }
  renderMiniPhoto(parent, photo, _sectionId, refresh) {
    const el = parent.createDiv({ cls: "hj-mini-photo" });
    el.draggable = true;
    el.addEventListener("dragstart", (e2) => {
      e2.dataTransfer?.setData("text/plain", photo.id);
      el.addClass("hj-dragging");
    });
    el.addEventListener("dragend", () => el.removeClass("hj-dragging"));
    const buf = this.photoBuffers.get(photo.id);
    if (buf) {
      const blob = new Blob([buf]);
      const img = el.createEl("img", { cls: "hj-mini-thumb" });
      img.src = URL.createObjectURL(blob);
      img.addEventListener("load", () => URL.revokeObjectURL(img.src));
    }
    el.createEl("span", { text: photo.filename, cls: "hj-mini-name" });
    if (photo.exif.hasGps)
      el.createEl("span", { text: "\u{1F4CD}", cls: "hj-mini-gps" });
    const assignSelect = el.createEl("select", { cls: "hj-mini-assign" });
    assignSelect.createEl("option", { value: "", text: "\u2192 Move to..." });
    for (const s2 of this.sections) {
      const prefix = s2.level === 3 ? "  \u2514 " : "";
      assignSelect.createEl("option", { value: s2.id, text: `${prefix}${s2.title || "Untitled"}` });
    }
    assignSelect.addEventListener("change", () => {
      if (!assignSelect.value)
        return;
      for (const s2 of this.sections)
        s2.photos = s2.photos.filter((id) => id !== photo.id);
      const target = this.sections.find((s2) => s2.id === assignSelect.value);
      if (target)
        target.photos.push(photo.id);
      refresh();
    });
  }
  // ==============================
  // Step 4: Review & Generate
  // ==============================
  renderStep4() {
    const el = this.contentEl;
    el.createEl("h2", { text: "\u2705 Step 4: Review & Generate" });
    const isGpxOnly = this.photos.size === 0 && !!this.trackResult;
    const summary = el.createDiv({ cls: "hj-wizard-summary" });
    summary.createEl("div", { text: `\u{1F4DD} ${this.config.name}`, cls: "hj-summary-name" });
    summary.createEl("div", { text: `\u{1F4C5} ${this.config.date} \u2022 \u{1F4CD} ${this.config.region}` });
    if (isGpxOnly) {
      summary.createEl("div", { text: `\u{1F5FA}\uFE0F GPX track: ${this.trackResult.trackPoints.length} points, ${this.trackResult.totalDistanceKm.toFixed(1)} km` });
      summary.createEl("div", { text: "\u{1F4CD} Scroll stops will be auto-generated along the route", cls: "hj-summary-hint" });
    } else {
      summary.createEl("div", { text: `\u{1F4F8} ${this.photos.size} photos \u2022 \u{1F4C2} ${this.sections.length} sections` });
    }
    const gpsCount = Array.from(this.photos.values()).filter((p2) => p2.exif.hasGps).length;
    const noGpsCount = this.photos.size - gpsCount;
    if (noGpsCount > 0) {
      summary.createEl("div", {
        text: `\u26A0\uFE0F ${noGpsCount} photo(s) without GPS \u2014 fill in the markdown later`,
        cls: "hj-summary-warn"
      });
    }
    const previewToggle = el.createEl("button", { text: "\u{1F441}\uFE0F Preview Markdown", cls: "hj-btn-secondary hj-btn-sm" });
    const previewEl = el.createDiv({ cls: "hj-markdown-preview" });
    previewEl.style.display = "none";
    previewToggle.addEventListener("click", () => {
      if (previewEl.style.display === "none") {
        const md = generateJournalMarkdown(this.config, this.sections, this.photos);
        previewEl.empty();
        previewEl.createEl("pre", { cls: "hj-preview-code" }).createEl("code", { text: md });
        previewEl.style.display = "block";
        previewToggle.setText("\u{1F648} Hide Preview");
      } else {
        previewEl.style.display = "none";
        previewToggle.setText("\u{1F441}\uFE0F Preview Markdown");
      }
    });
    el.createEl("h3", { text: "Section Outline", cls: "hj-outline-title" });
    const outline = el.createDiv({ cls: "hj-outline" });
    for (const section of this.sections.filter((s2) => s2.level === 2)) {
      const h2El = outline.createDiv({ cls: "hj-outline-h2" });
      h2El.createEl("span", { text: `## ${section.title || "Untitled"}` });
      h2El.createEl("span", { text: ` (${section.photos.length} photos)`, cls: "hj-outline-count" });
      for (const child of this.sections.filter((s2) => s2.parentId === section.id)) {
        const h3El = outline.createDiv({ cls: "hj-outline-h3" });
        h3El.createEl("span", { text: `### ${child.title || "Untitled"}` });
        h3El.createEl("span", { text: ` (${child.photos.length} photos)`, cls: "hj-outline-count" });
      }
    }
    el.createEl("h3", { text: "Output", cls: "hj-outline-title" });
    const outputInfo = el.createDiv({ cls: "hj-wizard-output-info" });
    outputInfo.createEl("div", { text: "\u{1F4C4} One single Markdown file with all sections and photo embeds" });
    outputInfo.createEl("div", { text: "\u{1F5BC}\uFE0F Photos copied into the trip folder alongside the .md file" });
    if (this.trackResult)
      outputInfo.createEl("div", { text: `\u{1F5FA}\uFE0F ${formatLabel(this.trackResult.format)} route file included (${this.trackFileName})` });
    outputInfo.createEl("div", { text: "\u2192 Edit the .md file directly in Obsidian to write your stories", cls: "hj-output-hint" });
    this.renderFooter(el, {
      backLabel: "\u2190 Back",
      onBack: () => {
        this.step = isGpxOnly ? 2 : 3;
        this.renderStep();
      },
      nextLabel: "\u{1F680} Generate Journal",
      nextCls: "hj-btn-primary",
      onNext: async () => {
        await this.generateJournal();
      }
    });
  }
  // ==============================
  // Core Logic
  // ==============================
  async importFiles(files) {
    const imageFiles = files.filter(
      (f2) => f2.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp|tiff?)$/i.test(f2.name)
    );
    if (imageFiles.length === 0) {
      new import_obsidian4.Notice("No image files found");
      return;
    }
    const notice = new import_obsidian4.Notice(`Importing ${imageFiles.length} photos...`, 0);
    for (const file of imageFiles) {
      const buffer = await file.arrayBuffer();
      const exif = await extractExifGps(buffer);
      const id = `photo-${++this.photoCounter}`;
      this.photos.set(id, { id, filename: file.name, vaultPath: "", exif, title: this.cleanFilename(file.name), aspectRatio: detectAspectRatio(buffer) });
      this.photoBuffers.set(id, buffer);
    }
    notice.hide();
    new import_obsidian4.Notice(`\u2705 Imported ${imageFiles.length} photos (${Array.from(this.photos.values()).filter((p2) => p2.exif.hasGps).length} with GPS)`);
  }
  addSection(level) {
    const id = `sec-${++this.sectionCounter}`;
    const section = { id, title: "", level, photos: [] };
    if (level === 3) {
      const h2s = this.sections.filter((s2) => s2.level === 2);
      if (h2s.length > 0)
        section.parentId = h2s[h2s.length - 1].id;
    }
    this.sections.push(section);
    return section;
  }
  autoCreateSections() {
    this.sections = [];
    this.sectionCounter = 0;
    const photoList = Array.from(this.photos.values()).sort((a2, b2) => {
      if (a2.exif.datetime && b2.exif.datetime)
        return a2.exif.datetime.localeCompare(b2.exif.datetime);
      return a2.filename.localeCompare(b2.filename);
    });
    if (photoList.length === 0)
      return;
    const dateGroups = /* @__PURE__ */ new Map();
    const noDatePhotos = [];
    for (const photo of photoList) {
      if (photo.exif.datetime) {
        const dateKey = photo.exif.datetime.split("T")[0];
        if (!dateGroups.has(dateKey))
          dateGroups.set(dateKey, []);
        dateGroups.get(dateKey).push(photo);
      } else {
        noDatePhotos.push(photo);
      }
    }
    if (dateGroups.size === 0) {
      const s2 = this.addSection(2);
      s2.title = this.config.region || "Trip Photos";
      s2.photos = photoList.map((p2) => p2.id);
      return;
    }
    const sortedDates = Array.from(dateGroups.keys()).sort();
    for (let i2 = 0; i2 < sortedDates.length; i2++) {
      const photos = dateGroups.get(sortedDates[i2]);
      const h2 = this.addSection(2);
      h2.title = `Day ${i2 + 1} \u2014 ${this.formatDate(sortedDates[i2])}`;
      if (photos.length <= 4) {
        h2.photos = photos.map((p2) => p2.id);
      } else {
        for (let j2 = 0; j2 < photos.length; j2 += 5) {
          const h3 = this.addSection(3);
          h3.parentId = h2.id;
          h3.title = `Section ${Math.floor(j2 / 5) + 1}`;
          h3.photos = photos.slice(j2, j2 + 5).map((p2) => p2.id);
        }
      }
    }
    if (noDatePhotos.length > 0) {
      const h2 = this.addSection(2);
      h2.title = "Other Photos";
      h2.photos = noDatePhotos.map((p2) => p2.id);
    }
  }
  // ==============================
  // V4 Journal Generation (multi-route)
  // ==============================
  async generateJournalV4() {
    const notice = new import_obsidian4.Notice("Generating journal...", 0);
    try {
      const slug = this.config.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `trip-${Date.now()}`;
      const folder = `${ROOT2}/${slug}`;
      await this.manager.ensureFolder(folder);
      // Copy photos into photos/ subfolder
      const photoFolder = `${folder}/photos`;
      await this.manager.ensureFolder(photoFolder);
      for (const [id, photo] of this.photos) {
        const buffer = this.photoBuffers.get(id);
        if (buffer) {
          const destPath = (0, import_obsidian4.normalizePath)(`${photoFolder}/${photo.filename}`);
          const existing = this.app.vault.getAbstractFileByPath(destPath);
          if (existing instanceof import_obsidian4.TFile)
            await this.app.vault.modifyBinary(existing, buffer);
          else
            await this.app.vault.createBinary(destPath, buffer);
          photo.vaultPath = destPath;
        }
      }
      // Copy all track files
      for (const track of this.tracks) {
        if (track.content && track.fileName) {
          const routePath = (0, import_obsidian4.normalizePath)(`${folder}/${track.fileName}`);
          const f = this.app.vault.getAbstractFileByPath(routePath);
          if (typeof track.content === "string") {
            if (f instanceof import_obsidian4.TFile) await this.app.vault.modify(f, track.content);
            else await this.app.vault.create(routePath, track.content);
          } else {
            if (f instanceof import_obsidian4.TFile) await this.app.vault.modifyBinary(f, track.content);
            else await this.app.vault.createBinary(routePath, track.content);
          }
        }
      }
      // Build routes for markdown generator
      const routes = this.tracks.map((t, i) => ({
        id: t.id,
        name: t.name || `Route ${i + 1}`,
        date: t.date || "",
        gpxFileName: t.fileName,
        stats: {
          distanceKm: t.result?.totalDistanceKm || 0,
          elevationGainM: t.result?.elevationGainM || 0,
          elevationLossM: t.result?.elevationLossM || 0
        },
        sortOrder: i
      }));
      // If no tracks, create a default route so locations have a parent
      if (routes.length === 0) {
        routes.push({
          id: "default",
          name: this.config.name,
          date: this.config.date,
          gpxFileName: "",
          stats: { distanceKm: 0, elevationGainM: 0, elevationLossM: 0 },
          sortOrder: 0
        });
        // Assign all locations to default route
        for (const loc of this.locations) {
          if (!loc.routeId) loc.routeId = "default";
        }
      }
      // Sort locations by position along GPX track (route order)
      for (const track of this.tracks) {
        const tp = track.result && track.result.trackPoints || [];
        if (!tp.length) continue;
        const routeLocs = this.locations.filter((l) => l.routeId === track.id);
        for (const loc of routeLocs) {
          if (!loc.lat || !loc.lng) continue;
          let minD = Infinity, bestIdx = 0;
          for (let i = 0; i < tp.length; i++) {
            const d = haversineKm(loc.lat, loc.lng, tp[i].lat, tp[i].lng);
            if (d < minD) { minD = d; bestIdx = i; }
          }
          loc.sortOrder = bestIdx;
        }
      }
      // Sort locationIds within each section by route order too
      if (this.sections) {
        for (const sec of this.sections) {
          sec.locationIds.sort((a, b) => {
            const la = this.locations.find((l) => l.id === a);
            const lb = this.locations.find((l) => l.id === b);
            return (la ? (la.sortOrder || 0) : 0) - (lb ? (lb.sortOrder || 0) : 0);
          });
        }
      }
      // Generate V5 markdown
      const markdown = generateJournalMarkdownV5(this.config, routes, this.locations, this.sections);
      const mdPath = (0, import_obsidian4.normalizePath)(`${folder}/${slug}.md`);
      const mdFile = this.app.vault.getAbstractFileByPath(mdPath);
      if (mdFile instanceof import_obsidian4.TFile)
        await this.app.vault.modify(mdFile, markdown);
      else
        await this.app.vault.create(mdPath, markdown);
      // Calculate center for index
      const totalDist = this.tracks.reduce((s, t) => s + (t.result?.totalDistanceKm || 0), 0);
      let centerLat, centerLng;
      const locsWithGps = this.locations.filter((l) => l.lat && l.lng);
      if (locsWithGps.length) {
        centerLat = locsWithGps.reduce((s, l) => s + l.lat, 0) / locsWithGps.length;
        centerLng = locsWithGps.reduce((s, l) => s + l.lng, 0) / locsWithGps.length;
      } else if (this.tracks.length > 0 && this.tracks[0].result?.trackPoints?.length) {
        const tp = this.tracks[0].result.trackPoints;
        centerLat = tp.reduce((s, p) => s + p.lat, 0) / tp.length;
        centerLng = tp.reduce((s, p) => s + p.lng, 0) / tp.length;
      }
      const wpCount = this.locations.length || this.photos.size;
      await this.manager.registerJournal(slug, this.config, wpCount, totalDist, centerLat, centerLng, routes.length);
      notice.hide();
      new import_obsidian4.Notice(`Journal created: ${slug}.md`);
      this.close();
      this.onComplete(mdPath);
    } catch (err) {
      notice.hide();
      console.error("[HJ] Generation failed:", err);
      new import_obsidian4.Notice(`Failed: ${err.message}`);
    }
  }
  /**
   * Legacy V3 journal generation (kept for backward compat).
   */
  async generateJournal() {
    const notice = new import_obsidian4.Notice("Generating journal...", 0);
    try {
      const slug = this.config.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `trip-${Date.now()}`;
      const folder = `${ROOT2}/${slug}`;
      await this.manager.ensureFolder(folder);
      for (const [id, photo] of this.photos) {
        const buffer = this.photoBuffers.get(id);
        if (buffer) {
          const destPath = (0, import_obsidian4.normalizePath)(`${folder}/${photo.filename}`);
          const existing = this.app.vault.getAbstractFileByPath(destPath);
          if (existing instanceof import_obsidian4.TFile)
            await this.app.vault.modifyBinary(existing, buffer);
          else
            await this.app.vault.createBinary(destPath, buffer);
          photo.vaultPath = destPath;
        }
      }
      if (this.trackContent && this.trackFileName) {
        const routePath = (0, import_obsidian4.normalizePath)(`${folder}/${this.trackFileName}`);
        const f2 = this.app.vault.getAbstractFileByPath(routePath);
        if (typeof this.trackContent === "string") {
          if (f2 instanceof import_obsidian4.TFile)
            await this.app.vault.modify(f2, this.trackContent);
          else
            await this.app.vault.create(routePath, this.trackContent);
        } else {
          if (f2 instanceof import_obsidian4.TFile)
            await this.app.vault.modifyBinary(f2, this.trackContent);
          else
            await this.app.vault.createBinary(routePath, this.trackContent);
        }
        this.config.gpxPath = this.trackFileName;
        if (this.trackResult) {
          this.config.distanceKm = Math.round(this.trackResult.totalDistanceKm * 10) / 10;
          this.config.elevationGainM = this.trackResult.elevationGainM;
          this.config.elevationLossM = this.trackResult.elevationLossM;
        }
      }
      const markdown = generateJournalMarkdown(this.config, this.sections, this.photos);
      const mdPath = (0, import_obsidian4.normalizePath)(`${folder}/${slug}.md`);
      const mdFile = this.app.vault.getAbstractFileByPath(mdPath);
      if (mdFile instanceof import_obsidian4.TFile)
        await this.app.vault.modify(mdFile, markdown);
      else
        await this.app.vault.create(mdPath, markdown);
      const wpCount = Array.from(this.photos.values()).filter((p2) => p2.exif.hasGps).length || this.sections.length || (this.trackResult ? this.trackResult.trackPoints.length : 0);
      const distKm = this.trackResult?.totalDistanceKm ?? 0;
      let centerLat, centerLng;
      const gpsPhotos = Array.from(this.photos.values()).filter((p2) => p2.exif.hasGps && p2.exif.lat && p2.exif.lng);
      if (gpsPhotos.length) {
        centerLat = gpsPhotos.reduce((s2, p2) => s2 + (p2.exif.lat || 0), 0) / gpsPhotos.length;
        centerLng = gpsPhotos.reduce((s2, p2) => s2 + (p2.exif.lng || 0), 0) / gpsPhotos.length;
      } else if (this.trackResult && this.trackResult.trackPoints.length) {
        const tp = this.trackResult.trackPoints;
        centerLat = tp.reduce((s2, p2) => s2 + p2.lat, 0) / tp.length;
        centerLng = tp.reduce((s2, p2) => s2 + p2.lng, 0) / tp.length;
      }
      await this.manager.registerJournal(slug, this.config, wpCount, distKm, centerLat, centerLng);
      notice.hide();
      new import_obsidian4.Notice(`\u2705 Journal created: ${slug}.md`);
      this.close();
      this.onComplete(mdPath);
    } catch (err) {
      notice.hide();
      console.error("[HJ] Generation failed:", err);
      new import_obsidian4.Notice(`\u274C Failed: ${err.message}`);
    }
  }
  // ==============================
  // Helpers
  // ==============================
  renderFooter(parent, opts) {
    const footer = parent.createDiv({ cls: "hj-modal-footer" });
    const steps = footer.createDiv({ cls: "hj-steps-indicator" });
    for (let i2 = 1; i2 <= 5; i2++) {
      steps.createEl("span", {
        text: `${i2}`,
        cls: `hj-step-dot ${i2 === this.step ? "hj-step-active" : ""} ${i2 < this.step ? "hj-step-done" : ""}`
      });
    }
    const btnGroup = footer.createDiv({ cls: "hj-footer-btns" });
    if (opts.backLabel && opts.onBack) {
      const b2 = btnGroup.createEl("button", { text: opts.backLabel, cls: "hj-btn-secondary" });
      b2.addEventListener("click", opts.onBack);
    }
    const n2 = btnGroup.createEl("button", { text: opts.nextLabel, cls: opts.nextCls || "hj-btn-primary" });
    n2.addEventListener("click", opts.onNext);
  }
  cleanFilename(filename) {
    const name = filename.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ");
    return /^(IMG|DSC|P|DSCN|SAM)?\s*\d+$/i.test(name) ? `Photo ${this.photoCounter}` : name;
  }
  formatDate(dateStr) {
    try {
      return (/* @__PURE__ */ new Date(dateStr + "T00:00:00")).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  }
};

// src/add-route-wizard.ts
// AddRouteWizard is now a thin wrapper around JournalWizard with existingTripId set
var AddRouteWizard = class {
  constructor(app, manager, tripId, onComplete, settings) {
    return new JournalWizard(app, manager, onComplete, settings, tripId);
  }
  // All logic delegated to JournalWizard via constructor return
  _unused_renderAddRouteStep1() {
    const el = this.contentEl;
    el.createEl("h2", { text: "Step 1: Upload New Route(s)" });
    el.createEl("p", { text: "Upload GPX files for the new route(s) to add.", cls: "hj-wizard-hint" });
    const gpxDrop = el.createDiv({ cls: "hj-drop-zone hj-drop-sm" });
    gpxDrop.createEl("div", { text: "\u{1F4C2}", cls: "hj-drop-icon" });
    gpxDrop.createEl("div", { text: "Drop .gpx / .kml / .kmz / .fit / .plt files" });
    const trackListEl = el.createDiv({ cls: "hj-track-list" });
    const renderTrackList = () => {
      trackListEl.empty();
      for (const track of this.tracks) {
        const item = trackListEl.createDiv({ cls: "hj-track-item" });
        const nameIn = item.createEl("input", {
          type: "text", cls: "hj-track-name-input",
          value: track.name, placeholder: "Route name"
        });
        nameIn.addEventListener("input", () => { track.name = nameIn.value; });
        item.createEl("span", {
          text: `${track.fileName} (${track.result.trackPoints.length} pts)`,
          cls: "hj-track-meta"
        });
        const delBtn = item.createEl("button", { text: "\u2715", cls: "hj-btn-icon-sm hj-btn-danger" });
        delBtn.addEventListener("click", () => {
          this.tracks = this.tracks.filter((t) => t.id !== track.id);
          renderTrackList();
        });
      }
    };
    const gpxFileInput = el.createEl("input", { type: "file" });
    gpxFileInput.accept = ACCEPT_STRING;
    gpxFileInput.multiple = true;
    gpxFileInput.style.display = "none";
    gpxDrop.addEventListener("click", () => gpxFileInput.click());
    gpxDrop.addEventListener("dragover", (e) => { e.preventDefault(); gpxDrop.addClass("hj-drop-active"); });
    gpxDrop.addEventListener("dragleave", () => gpxDrop.removeClass("hj-drop-active"));
    const handleImport = async (files) => {
      for (const file of files) {
        try {
          const fmt = detectFormat(file.name);
          if (!fmt) continue;
          const result = await parseTrackFile(file);
          const content = (fmt === "fit" || fmt === "kmz") ? await file.arrayBuffer() : await file.text();
          this.trackCounter++;
          this.tracks.push({
            id: `route-add-${this.trackCounter}`,
            name: `New Route ${this.trackCounter}`,
            fileName: file.name, content, result, date: ""
          });
        } catch (err) {
          new import_obsidian4.Notice(`Failed: ${file.name}: ${err.message}`);
        }
      }
      renderTrackList();
    };
    gpxDrop.addEventListener("drop", async (e) => {
      e.preventDefault(); gpxDrop.removeClass("hj-drop-active");
      if (e.dataTransfer?.files?.length) await handleImport(Array.from(e.dataTransfer.files));
    });
    gpxFileInput.addEventListener("change", async () => {
      if (gpxFileInput.files?.length) await handleImport(Array.from(gpxFileInput.files));
    });
    const footer = el.createDiv({ cls: "hj-modal-footer" });
    const btnGroup = footer.createDiv({ cls: "hj-footer-btns" });
    const nextBtn = btnGroup.createEl("button", { text: "Next: Add Locations \u2192", cls: "hj-btn-primary" });
    nextBtn.addEventListener("click", () => {
      if (this.tracks.length === 0) {
        new import_obsidian4.Notice("Please upload at least one route file");
        return;
      }
      this.step = 2;
      this.renderWizardStep();
    });
  }
  _unused_renderAddRouteStep2() {
    const el = this.contentEl;
    el.createEl("h2", { text: "Step 2: Add Locations & Photos" });
    el.createEl("p", { text: "Add location stops and photos for the new routes.", cls: "hj-wizard-hint" });
    // Simplified: auto-generate locations from tracks
    if (this.locations.length === 0) {
      for (const track of this.tracks) {
        const pts = track.result.trackPoints;
        if (pts.length < 2) continue;
        const numStops = Math.min(6, Math.max(2, Math.floor(track.result.totalDistanceKm / 5)));
        const step = Math.max(1, Math.floor(pts.length / numStops));
        for (let i = 0; i < pts.length; i += step) {
          this.locationCounter++;
          this.locations.push({
            id: `loc-add-${this.locationCounter}`,
            routeId: track.id,
            lat: Math.round(pts[i].lat * 1e6) / 1e6,
            lng: Math.round(pts[i].lng * 1e6) / 1e6,
            alt: pts[i].ele,
            title: `${track.name} - Stop ${this.locationCounter}`,
            description: "", blog: "", photos: [],
            gpsSource: "gpx", sortOrder: this.locationCounter - 1
          });
        }
      }
    }
    const locList = el.createDiv({ cls: "hj-locations-list" });
    for (const loc of this.locations) {
      const item = locList.createDiv({ cls: "hj-location-item" });
      const titleIn = item.createEl("input", {
        type: "text", cls: "hj-wizard-input hj-loc-title",
        value: loc.title, placeholder: "Location name"
      });
      titleIn.addEventListener("input", () => { loc.title = titleIn.value; });
      item.createEl("span", { text: `(${loc.lat?.toFixed(4)}, ${loc.lng?.toFixed(4)})`, cls: "hj-loc-coords" });
    }
    const footer = el.createDiv({ cls: "hj-modal-footer" });
    const btnGroup = footer.createDiv({ cls: "hj-footer-btns" });
    const backBtn = btnGroup.createEl("button", { text: "\u2190 Back", cls: "hj-btn-secondary" });
    backBtn.addEventListener("click", () => { this.step = 1; this.renderWizardStep(); });
    const nextBtn = btnGroup.createEl("button", { text: "Next: Review & Save \u2192", cls: "hj-btn-primary" });
    nextBtn.addEventListener("click", () => { this.step = 3; this.renderWizardStep(); });
  }
  _unused_renderAddRouteStep3() {
    const el = this.contentEl;
    el.createEl("h2", { text: "Step 3: Review & Append" });
    const summary = el.createDiv({ cls: "hj-wizard-summary" });
    summary.createEl("div", { text: `Adding to trip: ${this.tripId}` });
    summary.createEl("div", { text: `${this.tracks.length} new route(s) | ${this.locations.length} new location(s)` });
    const footer = el.createDiv({ cls: "hj-modal-footer" });
    const btnGroup = footer.createDiv({ cls: "hj-footer-btns" });
    const backBtn = btnGroup.createEl("button", { text: "\u2190 Back", cls: "hj-btn-secondary" });
    backBtn.addEventListener("click", () => { this.step = 2; this.renderWizardStep(); });
    const saveBtn = btnGroup.createEl("button", { text: "Append Routes", cls: "hj-btn-primary" });
    saveBtn.addEventListener("click", async () => {
      const notice = new import_obsidian4.Notice("Appending routes...", 0);
      try {
        const newRoutes = this.tracks.map((t, i) => ({
          id: t.id, name: t.name, date: t.date || "",
          gpxFileName: t.fileName, gpxContent: t.content,
          stats: {
            distanceKm: t.result?.totalDistanceKm || 0,
            elevationGainM: t.result?.elevationGainM || 0,
            elevationLossM: t.result?.elevationLossM || 0
          },
          sortOrder: i
        }));
        await this.manager.appendRouteToJournal(this.tripId, newRoutes, this.locations, this.photoBuffers);
        notice.hide();
        new import_obsidian4.Notice("Routes added successfully!");
        this.close();
        this.onComplete();
      } catch (err) {
        notice.hide();
        console.error("[HJ] Append failed:", err);
        new import_obsidian4.Notice(`Failed: ${err.message}`);
      }
    });
  }
};

// src/settings.ts
var DEFAULT_SETTINGS = { stadiaApiKey: "", geminiApiKey: "", geminiModel: "gemini-2.0-flash" };
var HJSettingTab = class extends import_obsidian5.PluginSettingTab {
  constructor(app2, plugin) {
    super(app2, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "HikerScrolls Settings" });
    const mottoEl = containerEl.createEl("p", { text: "Everybody can tell their own story on the road." });
    mottoEl.style.cssText = "font-style: italic; opacity: 0.7; margin-top: -8px; margin-bottom: 16px;";
    new import_obsidian5.Setting(containerEl)
      .setName("Stadia Maps API Key")
      .setDesc("Free API key from stadiamaps.com — required for Stamen Toner / Watercolor tiles. Leave empty to disable those map styles.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("Enter your API key")
          .setValue(this.plugin.settings.stadiaApiKey)
          .onChange(async (value) => {
            this.plugin.settings.stadiaApiKey = value.trim();
            STADIA_API_KEY = this.plugin.settings.stadiaApiKey;
            await this.plugin.saveSettings();
          });
      });
    containerEl.createEl("h3", { text: "AI Features (Gemini)" });
    new import_obsidian5.Setting(containerEl)
      .setName("Gemini API Key")
      .setDesc("Google Gemini API key for AI-assisted location detection and enrichment. Get one free at aistudio.google.com.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder("Enter your Gemini API key")
          .setValue(this.plugin.settings.geminiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.geminiApiKey = value.trim();
            await this.plugin.saveSettings();
          });
      });
    new import_obsidian5.Setting(containerEl)
      .setName("Gemini Model")
      .setDesc("Select the Gemini model for AI analysis and enrichment.")
      .addDropdown((drop) => {
        const GEMINI_MODELS = [
          { value: "gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite Preview" },
          { value: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image Preview" },
          { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview" },
          { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
          { value: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image Preview" },
          { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Default)" },
          { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
          { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
          { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
        ];
        GEMINI_MODELS.forEach((m) => drop.addOption(m.value, m.label));
        drop.setValue(this.plugin.settings.geminiModel || "gemini-2.0-flash");
        drop.onChange(async (value) => {
          this.plugin.settings.geminiModel = value;
          await this.plugin.saveSettings();
        });
      });
  }
};

// src/main.ts
var HikingJournalPlugin = class extends import_obsidian5.Plugin {
  async onload() {
    console.log("[HJ] Plugin loading...");
    await this.loadSettings();
    this.addSettingTab(new HJSettingTab(this.app, this));
    // Register custom icon: Journal Cover with mountain peaks
    (0, import_obsidian5.addIcon)("hiking-journal", '<rect x="20" y="10" width="60" height="78" rx="5" stroke="currentColor" fill="none" stroke-width="5"/><line x1="20" y1="26" x2="80" y2="26" stroke="currentColor" stroke-width="3.5"/><path d="M28 74 L46 34 L54 46 L68 28 L78 48" stroke="currentColor" fill="none" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>');
    this.mgr = new TripManager(this.app);
    await this.mgr.loadIndex();
    console.log("[HJ] Index loaded, trips:", this.mgr.getIndex().trips.length);
    this.registerView(LIBRARY_VIEW_TYPE, (leaf) => {
      const view = new LibraryView(leaf);
      this.setupLibrary(view);
      return view;
    });
    this.registerView(TRIP_VIEW_TYPE, (leaf) => {
      const view = new TripView(leaf);
      view.setup(this.mgr, () => this.openLibrary(), this.settings);
      return view;
    });
    this.registerView(TIMELINE_VIEW_TYPE, (leaf) => {
      const view = new TimelineView(leaf);
      this.setupTimeline(view);
      return view;
    });
    this.addRibbonIcon("hiking-journal", "HikerScrolls", () => this.openLibrary());
    this.addCommand({ id: "open-library", name: "Open Trip Library", callback: () => this.openLibrary() });
    this.addCommand({ id: "open-timeline", name: "Open Journal Timeline", callback: () => this.activateTimeline() });
    this.addCommand({ id: "new-journal", name: "New Journal (Wizard)", callback: () => this.openJournalWizard() });
    this.registerMarkdownCodeBlockProcessor("hiking-map", (source, el, ctx) => {
      this.renderMapBlock(source, el, ctx);
    });
    // Auto-activate timeline in right sidebar on layout ready
    this.app.workspace.onLayoutReady(() => this.activateTimeline());
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(TIMELINE_VIEW_TYPE);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    STADIA_API_KEY = this.settings.stadiaApiKey || "";
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // === Navigation ===
  async openLibrary() {
    await this.mgr.loadIndex();
    let leaf = this.app.workspace.getLeavesOfType(LIBRARY_VIEW_TYPE)[0];
    if (leaf) {
      this.setupLibrary(leaf.view);
      this.app.workspace.revealLeaf(leaf);
      return;
    }
    leaf = this.app.workspace.getLeavesOfType(TRIP_VIEW_TYPE)[0];
    if (leaf) {
      await leaf.setViewState({ type: LIBRARY_VIEW_TYPE, active: true });
      if (leaf.view?.getViewType() === LIBRARY_VIEW_TYPE)
        this.setupLibrary(leaf.view);
      this.app.workspace.revealLeaf(leaf);
      return;
    }
    const newLeaf = this.app.workspace.getMostRecentLeaf() || this.app.workspace.getLeaf(false);
    await newLeaf.setViewState({ type: LIBRARY_VIEW_TYPE, active: true });
    if (newLeaf.view?.getViewType() === LIBRARY_VIEW_TYPE)
      this.setupLibrary(newLeaf.view);
    this.app.workspace.revealLeaf(newLeaf);
  }
  async openTrip(id) {
    const trip = await this.mgr.loadTrip(id);
    if (!trip) {
      new import_obsidian5.Notice(`Cannot open trip "${id}"`);
      return;
    }
    const tripState = { tripId: id };
    const setup = (v2) => {
      v2.setup(this.mgr, () => this.openLibrary(), this.settings);
      v2.rebuild();
    };
    let leaf = this.app.workspace.getLeavesOfType(TRIP_VIEW_TYPE)[0];
    if (leaf) {
      setup(leaf.view);
      this.app.workspace.revealLeaf(leaf);
      return;
    }
    leaf = this.app.workspace.getLeavesOfType(LIBRARY_VIEW_TYPE)[0];
    if (leaf) {
      await leaf.setViewState({ type: TRIP_VIEW_TYPE, state: tripState, active: true });
      if (leaf.view?.getViewType() === TRIP_VIEW_TYPE)
        setup(leaf.view);
      this.app.workspace.revealLeaf(leaf);
      return;
    }
    const newLeaf = this.app.workspace.getMostRecentLeaf() || this.app.workspace.getLeaf(false);
    await newLeaf.setViewState({ type: TRIP_VIEW_TYPE, state: tripState, active: true });
    if (newLeaf.view?.getViewType() === TRIP_VIEW_TYPE)
      setup(newLeaf.view);
    this.app.workspace.revealLeaf(newLeaf);
  }
  // === Actions ===
  openJournalWizard() {
    new JournalWizard(this.app, this.mgr, async (journalPath) => {
      await this.mgr.loadIndex();
      const parts = journalPath.split("/");
      if (parts.length >= 2)
        await this.openTrip(parts[parts.length - 2]);
    }, this.settings).open();
  }
  setupLibrary(view) {
    view.setup({
      manager: this.mgr,
      settings: this.settings,
      onOpenTrip: (id) => this.openTrip(id),
      onInitJournal: () => this.openJournalWizard(),
      onDeleteTrip: (id) => this.mgr.deleteTrip(id),
      onAddRoute: (id) => this.openAddRouteWizard(id)
    });
    view.render();
  }
  setupTimeline(view) {
    view.setup({
      manager: this.mgr,
      onFlyToTrip: (id) => this.flyToTripOnMap(id),
      onGoHome: () => this.openLibrary()
    });
    view.render();
  }
  async flyToTripOnMap(tripId) {
    // Open library first, then fly to the trip marker
    await this.openLibrary();
    const leaf = this.app.workspace.getLeavesOfType(LIBRARY_VIEW_TYPE)[0];
    if (!leaf || !leaf.view?.map) return;
    const trip = this.mgr.getIndex().trips.find((t) => t.id === tripId);
    if (!trip || trip.centerLat == null || trip.centerLng == null) return;
    leaf.view.map.flyTo([trip.centerLat, trip.centerLng], 12, { duration: 1.5 });
    // Open the popup for this trip's marker
    if (leaf.view.markers) {
      for (const m of leaf.view.markers) {
        const ll = m.getLatLng();
        if (Math.abs(ll.lat - trip.centerLat) < 0.001 && Math.abs(ll.lng - trip.centerLng) < 0.001) {
          setTimeout(() => m.openPopup(), 1600);
          break;
        }
      }
    }
  }
  async activateTimeline() {
    await this.mgr.loadIndex();
    const existing = this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
    if (existing.length) {
      this.setupTimeline(existing[0].view);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: TIMELINE_VIEW_TYPE, active: true });
    if (leaf.view?.getViewType() === TIMELINE_VIEW_TYPE)
      this.setupTimeline(leaf.view);
  }
  openAddRouteWizard(tripId) {
    new AddRouteWizard(this.app, this.mgr, tripId, async () => {
      await this.mgr.loadIndex();
      await this.openTrip(tripId);
    }, this.settings).open();
  }
  // === Code Block: hiking-map ===
  renderMapBlock(source, el, ctx) {
    const cfg = { center: [20, 0], zoom: 2, height: 400 };
    for (const line of source.split("\n")) {
      const m = line.match(/^\s*(\w+)\s*:\s*(.+)\s*$/);
      if (!m) continue;
      const key = m[1].toLowerCase(), val = m[2].trim();
      if (key === "center") {
        const parts = val.split(",").map((s) => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) cfg.center = parts;
      } else if (key === "zoom") {
        const z = parseInt(val);
        if (!isNaN(z) && z >= 1 && z <= 18) cfg.zoom = z;
      } else if (key === "height") {
        const h = parseInt(val);
        if (!isNaN(h) && h >= 100) cfg.height = h;
      }
    }
    const wrap = el.createDiv({ cls: "hj-block-map" });
    wrap.style.height = cfg.height + "px";
    const mapDiv = wrap.createDiv({ cls: "hj-block-map-inner" });
    mapDiv.style.height = "100%";
    const map = L2.map(mapDiv, {
      center: cfg.center,
      zoom: cfg.zoom,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: false
    });
    setTimeout(() => map.invalidateSize(), 100);
    L2.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: "\xA9 OpenStreetMap \xA9 CARTO"
    }).addTo(map);
    const topoLayer = L2.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      subdomains: "abc",
      maxZoom: 17,
      opacity: 0
    }).addTo(map);
    map.on("zoomend", () => {
      const z = map.getZoom();
      topoLayer.setOpacity(z >= 10 ? Math.min(0.4, (z - 10) * 0.1) : 0);
    });
    L2.control.zoom({ position: "bottomright" }).addTo(map);
    L2.control.attribution({ position: "bottomleft", prefix: false })
      .addAttribution('\xA9 <a href="https://carto.com">CARTO</a> \xB7 <a href="https://opentopomap.org">OpenTopoMap</a>')
      .addTo(map);
    const trips = this.mgr.getIndex().trips.filter((t) => t.centerLat != null && t.centerLng != null);
    const dotIcon = L2.divIcon({ className: "hj-map-dot", iconSize: [14, 14], iconAnchor: [7, 7] });
    const markers = [];
    for (const trip of trips) {
      const marker = L2.marker([trip.centerLat, trip.centerLng], { icon: dotIcon }).addTo(map);
      marker.bindTooltip(trip.name, {
        permanent: true, direction: "right", offset: [10, 0], className: "hj-map-tooltip"
      });
      const popup = document.createElement("div");
      popup.className = "hj-map-popup-content";
      popup.innerHTML = `<div class="hj-map-popup-name">${trip.name}</div><div class="hj-map-popup-meta">${trip.region ? "<span>\u{1F4CD} " + trip.region + "</span>" : ""}${trip.date ? " <span>\u{1F4C5} " + trip.date + "</span>" : ""}${trip.distanceKm ? " <span>" + trip.distanceKm.toFixed(1) + " km</span>" : ""}</div>`;
      const openBtn = popup.createEl("button", { text: "Open Journal", cls: "hj-btn-primary hj-btn-sm" });
      openBtn.addEventListener("click", () => this.openTrip(trip.id));
      marker.bindPopup(popup, { maxWidth: 250, closeButton: true });
      marker.on("click", () => map.flyTo([trip.centerLat, trip.centerLng], 12, { duration: 1.5 }));
      markers.push(marker);
    }
    const gpxLayers = [];
    const gpxLoaded = new Set();
    const loadVisibleGpx = async () => {
      if (map.getZoom() < 6) return;
      const bounds = map.getBounds();
      for (const trip of trips) {
        if (gpxLoaded.has(trip.id)) continue;
        if (!bounds.contains([trip.centerLat, trip.centerLng])) continue;
        gpxLoaded.add(trip.id);
        try {
          const folder = `hiking-journal/${trip.id}`;
          const routeColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
          const mdFiles = this.app.vault.getFiles().filter(
            (f) => f.path.startsWith((0, import_obsidian2.normalizePath)(folder) + "/") && f.extension === "md"
          );
          for (const md of mdFiles) {
            const content = await this.app.vault.read(md);
            if (!content.includes("type: hiking-journal")) continue;
            const routesJsonMatch = content.match(/^routes_json:\s*'((?:[^']|'')+)'/m);
            if (routesJsonMatch) {
              const routes = JSON.parse(routesJsonMatch[1].replace(/''/g, "'"));
              let ci = 0;
              for (const route of routes) {
                if (!route.gpx) continue;
                const gpxFile = this.app.vault.getAbstractFileByPath(
                  (0, import_obsidian2.normalizePath)(`${folder}/${route.gpx.trim()}`)
                );
                if (!(gpxFile instanceof import_obsidian2.TFile)) continue;
                const result = parseTrackText(await this.app.vault.read(gpxFile), gpxFile.name);
                if (result.trackPoints.length < 2) continue;
                const pts = result.trackPoints;
                const step = Math.max(1, Math.floor(pts.length / 200));
                const latLngs = [];
                for (let i = 0; i < pts.length; i += step) latLngs.push(L2.latLng(pts[i].lat, pts[i].lng));
                latLngs.push(L2.latLng(pts[pts.length - 1].lat, pts[pts.length - 1].lng));
                const color = routeColors[ci % routeColors.length];
                ci++;
                gpxLayers.push(
                  L2.polyline(latLngs, { color, weight: 3, lineCap: "round", lineJoin: "round", opacity: 0.6 }).addTo(map)
                );
              }
              break;
            }
            const gpxMatch = content.match(/^gpx:\s*"?([^"\n]+)"?/m);
            if (gpxMatch) {
              const gpxFile = this.app.vault.getAbstractFileByPath(
                (0, import_obsidian2.normalizePath)(`${folder}/${gpxMatch[1].trim()}`)
              );
              if (gpxFile instanceof import_obsidian2.TFile) {
                const result = parseTrackText(await this.app.vault.read(gpxFile), gpxFile.name);
                if (result.trackPoints.length >= 2) {
                  const pts = result.trackPoints;
                  const step = Math.max(1, Math.floor(pts.length / 200));
                  const latLngs = [];
                  for (let i = 0; i < pts.length; i += step) latLngs.push(L2.latLng(pts[i].lat, pts[i].lng));
                  latLngs.push(L2.latLng(pts[pts.length - 1].lat, pts[pts.length - 1].lng));
                  gpxLayers.push(
                    L2.polyline(latLngs, { color: "#ef4444", weight: 3, lineCap: "round", lineJoin: "round", opacity: 0.6 }).addTo(map)
                  );
                }
              }
              break;
            }
          }
        } catch (e) { /* silent */ }
      }
    };
    map.on("zoomend moveend", loadVisibleGpx);
    loadVisibleGpx();
    const child = new import_obsidian5.MarkdownRenderChild(wrap);
    child.onunload = () => {
      map.remove();
      markers.length = 0;
      gpxLayers.length = 0;
      gpxLoaded.clear();
    };
    ctx.addChild(child);
  }
};
/*! Bundled license information:

leaflet/dist/leaflet-src.js:
  (* @preserve
   * Leaflet 1.9.4, a JS library for interactive maps. https://leafletjs.com
   * (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade
   *)
*/
