const THREE = require('three')

class Test {
    constructor(renderer_) {
        const renderer = (renderer_) ? renderer_ : new THREE.WebGLRenderer()
        const renderTarget = new THREE.WebGLRenderTarget()
  
        const scene = new THREE.Scene()
        const camera = new THREE.Camera()
        const geometry = new THREE.PlaneGeometry(2, 2)
  
        const fragmentShader = `
          uniform sampler2D srcTexture;
          uniform vec2 imgSize;
  
          float threshold(in float thr1, in float thr2, in float val) {
            if (val < thr1) { return 0. ;}
            if (val > thr2) { return 1. ;}
            return val;
          }
  
          float diff(in vec4 pix1, in vec4 pix2) {
            return (
              abs(pix1.r - pix2.r) +
              abs(pix1.g - pix2.g) +
              abs(pix1.b - pix2.b)
            ) / 3.;
          }
  
          float edge(in sampler2D tex, in vec2 coords, in vec2 renderSize) {
            float dx = 1. / renderSize.x;
            float dy = 1. / renderSize.y;
  
            vec4 pix[9];
  
            pix[0] = texture2D(tex, coords + vec2( -1.0 * dx, -1.0 * dy));
            pix[1] = texture2D(tex, coords + vec2( -1.0 * dx, 0.0 * dy));
            pix[2] = texture2D(tex, coords + vec2( -1.0 * dx, 1.0 * dy));
            pix[3] = texture2D(tex, coords + vec2( 0.0 * dx, -1.0 * dy));
            pix[4] = texture2D(tex, coords + vec2( 0.0 * dx, 0.0 * dy));
            pix[5] = texture2D(tex, coords + vec2( -.0 * dx, 1.0 * dy));
            pix[6] = texture2D(tex, coords + vec2( 1.0 * dx, -1.0 * dy));
            pix[7] = texture2D(tex, coords + vec2( 1.0 * dx, 0.0 * dy));
            pix[8] = texture2D(tex, coords + vec2( 1.0 * dx, 1.0 * dy));
  
            float delta = (diff(pix[1], pix[7]) + diff(pix[5], pix[3]) + diff(pix[0], pix[8]) + diff(pix[2], pix[6])) / 4.;
            
            return threshold(0., 0.3, clamp(5. * delta, 0., 1.));
          }
  
          void main() {
            vec4 color = vec4(0.4, 0.4, 0.4, 1.0);
            vec2 uv = gl_FragCoord.xy / imgSize.xy;
            uv.y = 1. - uv.y;
            color.rgb = vec3(edge(srcTexture, uv, imgSize));
            gl_FragColor = color;
          }
        `
  
        const material = new THREE.ShaderMaterial({
          vertexShader: `void main() {
            gl_Position = vec4(position, 1.);
          }`,
          fragmentShader,
          uniforms: {
            srcTexture: {
              type: 't',
              value: null
            },
            imgSize: {
              type: 'v2',
              value: new THREE.Vector2(0, 0)
            }
          },
        })
  
        const mesh = new THREE.Mesh(geometry, material)
  
        scene.add(mesh)
  
        this.renderer = renderer
        this.renderTarget = renderTarget
        this.mesh = mesh
        this.scene = scene
        this.camera = camera
    }

    detect(img) {
      return new Promise((resolve) => {
        const { renderer, renderTarget, mesh, scene, camera } = this
        renderer.setSize(img.width, img.height)
        renderTarget.setSize(img.width, img.height)
  
        const srcTexture = new THREE.Texture(img)
        srcTexture.needsUpdate = true
  
        mesh.material.uniforms.srcTexture.value = srcTexture
        mesh.material.uniforms.imgSize.value = new THREE.Vector2(img.width, img.height)
  
        renderer.render(scene, camera)
        renderer.render(scene, camera, renderTarget)
  
        const gl = renderer.getContext()
        const framebuffer = renderTarget.__webglFramebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
        const data = new Uint8Array(renderTarget.width * renderTarget.height * 4)
        gl.readPixels(0,0,renderTarget.width,renderTarget.height,gl.RGBA,gl.UNSIGNED_BYTE,data)
  
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const context = canvas.getContext('2d')
  
        const imgData = context.getImageData(0, 0, img.width, img.height)
        for(let i = 0; i < data.length; i++) imgData.data[i] = data[i]
        context.putImageData(imgData, 0, 0)

        let resultImg = new Image()
        resultImg.src = canvas.toDataURL()

        resultImg.onload = () => {
          resolve(resultImg)
        }
      })
    }
}

export default Test