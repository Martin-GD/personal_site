import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const sourceDir = path.join(root, "public/maps")

const squaredDistance = (a, b) => {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

const simplifyLine = (points, tolerance) => {
  if (points.length <= 3) return points

  const squaredTolerance = tolerance * tolerance
  const keep = new Uint8Array(points.length)
  const stack = [[0, points.length - 1]]
  keep[0] = 1
  keep[points.length - 1] = 1

  while (stack.length) {
    const [start, end] = stack.pop()
    const first = points[start]
    const last = points[end]
    const dx = last[0] - first[0]
    const dy = last[1] - first[1]
    let furthestDistance = squaredTolerance
    let furthestIndex = -1

    for (let index = start + 1; index < end; index += 1) {
      let distance
      if (dx === 0 && dy === 0) {
        distance = squaredDistance(points[index], first)
      } else {
        const position = (
          (points[index][0] - first[0]) * dx +
          (points[index][1] - first[1]) * dy
        ) / (dx * dx + dy * dy)
        const projected = position > 1
          ? last
          : position > 0
            ? [first[0] + dx * position, first[1] + dy * position]
            : first
        distance = squaredDistance(points[index], projected)
      }

      if (distance > furthestDistance) {
        furthestDistance = distance
        furthestIndex = index
      }
    }

    if (furthestIndex !== -1) {
      keep[furthestIndex] = 1
      stack.push([start, furthestIndex], [furthestIndex, end])
    }
  }

  return points.filter((_, index) => keep[index])
}

const simplifyRing = (ring, tolerance) => {
  const isClosed = ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  const points = isClosed ? ring.slice(0, -1) : ring
  const simplified = simplifyLine(points, tolerance)

  if (simplified.length < 3) return ring
  return [...simplified, simplified[0]]
}

const simplifyCoordinates = (coordinates, type, tolerance) => {
  if (type === "Polygon") {
    return coordinates.map(ring => simplifyRing(ring, tolerance))
  }

  if (type === "MultiPolygon") {
    return coordinates.map(polygon => polygon.map(ring => simplifyRing(ring, tolerance)))
  }

  return coordinates
}

const simplifyFile = (sourceName, targetName, tolerance) => {
  const source = JSON.parse(fs.readFileSync(path.join(sourceDir, sourceName), "utf8"))
  const target = {
    type: "FeatureCollection",
    features: source.features.map(feature => ({
      type: "Feature",
      properties: {
        id: feature.properties.id,
        name: feature.properties.name,
        "地名": feature.properties["地名"],
        "区划码": feature.properties["区划码"]
      },
      geometry: {
        type: feature.geometry.type,
        coordinates: simplifyCoordinates(feature.geometry.coordinates, feature.geometry.type, tolerance)
      }
    }))
  }

  fs.writeFileSync(path.join(sourceDir, targetName), JSON.stringify(target))
}

simplifyFile("china-prefectures.json", "china-prefectures-lite.json", 0.035)
simplifyFile("china-provinces.json", "china-provinces-lite.json", 0.05)

const mapWidth = 800
const mapHeight = 560
const mapScale = 700
const mapCenter = [104, 35]
const capitalCodes = new Set([
  "110000", "120000", "130100", "140100", "150100", "210100", "220100", "230100",
  "310000", "320100", "330100", "340100", "350100", "360100", "370100", "410100",
  "420100", "430100", "440100", "450100", "460100", "500000", "510100", "520100",
  "530100", "540100", "610100", "620100", "630100", "640100", "650100"
])

const mercatorY = latitude => Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI / 180) / 2))
const centerMercatorY = mercatorY(mapCenter[1])

const projectPoint = ([longitude, latitude]) => [
  mapWidth / 2 + mapScale * (longitude - mapCenter[0]) * Math.PI / 180,
  mapHeight / 2 - mapScale * (mercatorY(latitude) - centerMercatorY)
]

const format = value => Number(value.toFixed(2))

const ringToPath = ring => `${ring.map((point, index) => {
  const [x, y] = projectPoint(point)
  return `${index === 0 ? "M" : "L"}${format(x)} ${format(y)}`
}).join("")}Z`

const geometryToPath = geometry => {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringToPath).join("")
  }

  return geometry.coordinates
    .flatMap(polygon => polygon.map(ringToPath))
    .join("")
}

const allCoordinates = geometry => {
  if (geometry.type === "Polygon") return geometry.coordinates.flat()
  return geometry.coordinates.flat(2)
}

const projectedBounds = (geometry, coordinateFilter = () => true) => {
  const projected = allCoordinates(geometry)
    .filter(coordinateFilter)
    .map(projectPoint)

  if (!projected.length) return null

  return {
    minX: Math.min(...projected.map(point => point[0])),
    minY: Math.min(...projected.map(point => point[1])),
    maxX: Math.max(...projected.map(point => point[0])),
    maxY: Math.max(...projected.map(point => point[1]))
  }
}

const viewBoxForBounds = bounds => {
  const aspect = mapWidth / mapHeight
  const padding = 14
  let width = bounds.maxX - bounds.minX + padding * 2
  let height = bounds.maxY - bounds.minY + padding * 2

  if (width / height < aspect) width = height * aspect
  else height = width / aspect

  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  return [
    format(centerX - width / 2),
    format(centerY - height / 2),
    format(width),
    format(height)
  ]
}

const buildStaticMap = () => {
  const prefectures = JSON.parse(fs.readFileSync(path.join(sourceDir, "china-prefectures-lite.json"), "utf8"))
  const provinces = JSON.parse(fs.readFileSync(path.join(sourceDir, "china-provinces-lite.json"), "utf8"))
  const cityShapes = prefectures.features.map(feature => {
    const coordinates = allCoordinates(feature.geometry)
    const center = coordinates.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0])
    const average = [center[0] / coordinates.length, center[1] / coordinates.length]
    const [x, y] = projectPoint(average)
    const properties = feature.properties
    const id = String(properties.id)

    return {
      id,
      name: properties.name || properties["地名"],
      provinceId: `${id.slice(0, 2)}0000`,
      d: geometryToPath(feature.geometry),
      x: format(x),
      y: format(y),
      capital: capitalCodes.has(id)
    }
  })

  const provinceShapes = provinces.features.map(feature => {
    const properties = feature.properties
    const id = String(properties.id)
    const bounds = projectedBounds(feature.geometry)

    return {
      id,
      name: properties.name || properties["地名"],
      d: geometryToPath(feature.geometry),
      viewBox: viewBoxForBounds(bounds)
    }
  })

  // Keep the main map focused on mainland China. The source also contains
  // distant South China Sea islands, which would otherwise shrink the map.
  const mainlandCoordinate = ([longitude, latitude]) => (
    longitude >= 73 && longitude <= 136 && latitude >= 17.5 && latitude <= 54.5
  )

  const globalBounds = provinces.features.reduce((result, feature) => {
    const bounds = projectedBounds(feature.geometry, mainlandCoordinate)
    if (!bounds) return result

    return {
      minX: Math.min(result.minX, bounds.minX),
      minY: Math.min(result.minY, bounds.minY),
      maxX: Math.max(result.maxX, bounds.maxX),
      maxY: Math.max(result.maxY, bounds.maxY)
    }
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })

  const staticMap = {
    width: mapWidth,
    height: mapHeight,
    viewBox: viewBoxForBounds(globalBounds),
    provinceShapes,
    cityShapes
  }

  fs.writeFileSync(
    path.join(sourceDir, "china-footprints-map.json"),
    JSON.stringify(staticMap)
  )
}

buildStaticMap()
