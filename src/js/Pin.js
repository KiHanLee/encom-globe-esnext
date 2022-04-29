const THREE = require('three')
const TWEEN = require('tween.js')
const utils = require('./utils')

const createTopCanvas = function (color) {
  const markerWidth = 20
  const markerHeight = 20

  return utils.renderToCanvas(markerWidth, markerHeight, function (ctx) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(markerWidth / 2, markerHeight / 2, markerWidth / 4, 0, 2 * Math.PI)
    ctx.fill()
  })
}

class Pin {
  constructor(lat, lon, text, altitude, scene, smokeProvider, _opts) {
    /* options that can be passed in */
    const opts = {
      lineColor: '#8FD8D8',
      lineWidth: 1,
      topColor: '#8FD8D8',
      smokeColor: '#FFF',
      labelColor: '#FFF',
      font: 'Inconsolata',
      showLabel: text.length > 0,
      showTop: text.length > 0,
      showSmoke: text.length > 0
    }
    if (_opts) {
      for (let i in opts) {
        if (_opts[i] != undefined) {
          opts[i] = _opts[i]
        }
      }
    }
    this.opts = opts

    this.topVisible = opts.showTop
    this.smokeVisible = opts.showSmoke
    this.labelVisible = opts.showLabel

    this.lat = lat
    this.lon = lon
    this.text = text
    this.altitude = altitude
    this.scene = scene
    this.smokeProvider = smokeProvider
    this.dateCreated = Date.now()

    this.lineGeometry = {}
    this.line = {}
    this.labelSprite = {}
    this.topSprite = {}

    let lineMaterial = {}
    let labelCanvas = {}
    let labelTexture = {}
    let labelMaterial = {}
    let topTexture = {}
    let topMaterial = {}
    let point = {}

    /* the line */
    this.lineGeometry = new THREE.Geometry()
    lineMaterial = new THREE.LineBasicMaterial({
      color: opts.lineColor,
      linewidth: opts.lineWidth
    })
    point = utils.mapPoint(lat, lon)
    this.lineGeometry.vertices.push(
      new THREE.Vector3(point.x, point.y, point.z)
    )
    this.lineGeometry.vertices.push(
      new THREE.Vector3(point.x, point.y, point.z)
    )
    this.line = new THREE.Line(this.lineGeometry, lineMaterial)

    /* the label */
    labelCanvas = utils.createLabel(text, 18, opts.labelColor, opts.font)
    labelTexture = new THREE.Texture(labelCanvas)
    labelTexture.needsUpdate = true
    labelMaterial = new THREE.SpriteMaterial({
      map: labelTexture,
      useScreenCoordinates: false,
      opacity: 0,
      depthTest: true,
      fog: true
    })
    this.labelSprite = new THREE.Sprite(labelMaterial)
    this.labelSprite.position = {
      x: point.x * altitude * 1.1,
      y: point.y * altitude + (point.y < 0 ? -15 : 30),
      z: point.z * altitude * 1.1
    }
    this.labelSprite.scale.set(labelCanvas.width, labelCanvas.height)

    /* the top */
    topTexture = new THREE.Texture(createTopCanvas(opts.topColor))
    topTexture.needsUpdate = true
    topMaterial = new THREE.SpriteMaterial({
      map: topTexture,
      depthTest: true,
      fog: true,
      opacity: 0
    })
    this.topSprite = new THREE.Sprite(topMaterial)
    this.topSprite.scale.set(20, 20)
    this.topSprite.position.set(
      point.x * altitude,
      point.y * altitude,
      point.z * altitude
    )

    /* the smoke */
    if (this.smokeVisible)
      this.smokeId = smokeProvider.setFire(lat, lon, altitude)

    const _this = this //arghhh

    /* intro animations */
    if (opts.showTop || opts.showLabel) {
      new TWEEN.Tween({ opacity: 0 })
        .to({ opacity: 1 }, 500)
        .onUpdate(function () {
          if (_this.topVisible) topMaterial.opacity = this.opacity
          else topMaterial.opacity = 0
          if (_this.labelVisible) labelMaterial.opacity = this.opacity
          else labelMaterial.opacity = 0
        }).delay(1000).start()
    }

    new TWEEN.Tween(point)
      .to(
        { x: point.x * altitude, y: point.y * altitude, z: point.z * altitude },
        1500
      )
      .easing(TWEEN.Easing.Elastic.Out)
      .onUpdate(function () {
        _this.lineGeometry.vertices[1].x = this.x
        _this.lineGeometry.vertices[1].y = this.y
        _this.lineGeometry.vertices[1].z = this.z
        _this.lineGeometry.verticesNeedUpdate = true
      })
      .start()

    /* add to scene */
    this.scene.add(this.labelSprite)
    this.scene.add(this.line)
    this.scene.add(this.topSprite)
  }

  toString() {
    return `${this.lat}_${this.lon}`
  }

  changeAltitude(altitude) {
    const point = utils.mapPoint(this.lat, this.lon)
    const _this = this // arghhhh
  
    new TWEEN.Tween({ altitude: this.altitude })
      .to({ altitude: altitude }, 1500)
      .easing(TWEEN.Easing.Elastic.Out)
      .onUpdate(function () {
        if (_this.smokeVisible) _this.smokeProvider.changeAltitude(this.altitude, _this.smokeId)
        if (_this.topVisible) {
          _this.topSprite.position.set(
            point.x * this.altitude,
            point.y * this.altitude,
            point.z * this.altitude
          )
        }
        if (_this.labelVisible) {
          _this.labelSprite.position = {
            x: point.x * this.altitude * 1.1,
            y: point.y * this.altitude + (point.y < 0 ? -15 : 30),
            z: point.z * this.altitude * 1.1
          }
        }
        _this.lineGeometry.vertices[1].x = point.x * this.altitude
        _this.lineGeometry.vertices[1].y = point.y * this.altitude
        _this.lineGeometry.vertices[1].z = point.z * this.altitude
        _this.lineGeometry.verticesNeedUpdate = true
      })
      .onComplete(function () {
        _this.altitude = altitude
      })
      .start()
  }

  hideTop() {
    if (this.topVisible) {
      this.topSprite.material.opacity = 0.0
      this.topVisible = false
    }
  }

  showTop() {
    if (!this.topVisible) {
      this.topSprite.material.opacity = 1.0
      this.topVisible = true
    }
  }

  hideLabel() {
    if (this.labelVisible) {
      this.labelSprite.material.opacity = 0.0
      this.labelVisible = false
    }
  }

  showLabel() {
    if (!this.labelVisible) {
      this.labelSprite.material.opacity = 1.0
      this.labelVisible = true
    }
  }

  hideSmoke() {
    if (this.smokeVisible) {
      this.smokeProvider.extinguish(this.smokeId)
      this.smokeVisible = false
    }
  }

  showSmoke() {
    if (!this.smokeVisible) {
      this.smokeId = this.smokeProvider.setFire(this.lat, this.lon, this.altitude)
      this.smokeVisible = true
    }
  }

  age() {
    return Date.now() - this.dateCreated
  }

  remove() {
    this.scene.remove(this.labelSprite)
    this.scene.remove(this.line)
    this.scene.remove(this.topSprite)
  
    if (this.smokeVisible) this.smokeProvider.extinguish(this.smokeId)
  }
}


module.exports = Pin