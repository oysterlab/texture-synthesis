import EdgeDetector from './EdgeDetector'
const THREE = require('three')
const GPU = require('./GPU')

class TextureSynthesis {
    constructor() {
        const edgeDetector = new EdgeDetector()
        this.edgeDetector = edgeDetector

        this.ITER_COUNT = 10000
        this.TILE_SIZE = {w: 38, h: 38}
        this.OVERLAP_AREA = {w: 18, h: 18}
    }

    synthesis(img, edgeResizeRatio, 
      {
        radial,
        withEdge,
        samplingSides,
        debug
      }) {
        return new Promise((resolve) => {
            this.getReady(img, edgeResizeRatio).then((data) => {
                const {
                    originImg,
                    resizeImg,
                    resizeColorImg,
    
                    edgeResizeImg,
                    edgeResizeColorImg,
    
                    originTargetArea,
                    edgeTargetArea,
                    
                    evaluation,
                } = data
    
                let tiles = this.getTilePositions(edgeTargetArea)
                
                if (radial) {
                  tiles = this.getRadialTilePositions(edgeTargetArea)
                }

                const srcImg = (withEdge) ? edgeResizeColorImg : resizeColorImg
                let srcImageData = this.cloneImageData(srcImg)
                let resultImageData = this.cloneImageData(srcImg)
        
                const srcCanavs = document.createElement('canvas')
                srcCanavs.width = srcImg.width
                srcCanavs.height = srcImg.height
                const srcContext = srcCanavs.getContext('2d')
                srcContext.drawImage(srcImg, 0, 0, srcImg.width, srcImg.height)

                if(debug)
                    document.body.appendChild(srcCanavs)
    
    
                const patchs = []
                let k = 0
                const createNextPatch = () => {
                    let targetTile = tiles[k]
                    this.nextPatch(srcImageData.data, resultImageData.data, targetTile, samplingSides)
                    .then((patchPos) => {
                        const { TILE_SIZE, OVERLAP_AREA } = this
                        
                        srcContext.putImageData(resultImageData, 0, 0)
    
                        const oriPatchImgData = srcContext.getImageData(targetTile[0], targetTile[1], TILE_SIZE.w, TILE_SIZE.h)
                        const findedPatchImgData = srcContext.getImageData(patchPos[0], patchPos[1], TILE_SIZE.w, TILE_SIZE.h)
    
                        const nextPatchImgData = this.seamPatch(oriPatchImgData, findedPatchImgData, TILE_SIZE, OVERLAP_AREA)
                        srcContext.putImageData(nextPatchImgData, targetTile[0], targetTile[1])
                                                
                        resultImageData = this.cloneImageData(srcCanavs)
    
                        patchs.push(patchPos)
    
                        k++
                        if(k < tiles.length) {
                            setTimeout(() => {
                                createNextPatch(patchs)
                            }, 2)
                        } else {
                            const genStartTime = new Date()
                            const result = this.createResult(tiles, patchs, 1 / edgeResizeRatio)

                            if (debug) {
                              console.log('[createResult]')
                              console.log(`\t${((new Date()) - genStartTime) / 1000}s`)
                            }

                            resolve(result)
                        }
                    })
                }
    
                createNextPatch()
            })
        })
    }

    createResult(tiles, patchs, resizeRatio) {
        const {
            originImg,
            originColorImg,
            resizeImg,
            resizeColorImg,

            edgeResizeImg,
            edgeResizeColorImg,

            originTargetArea,
            edgeTargetArea,
            
            evaluation,
        } = this.data

        const canvas = document.createElement('canvas')
        canvas.width = originColorImg.width
        canvas.height = originColorImg.height
        const context = canvas.getContext('2d')
 
        context.drawImage(originColorImg, 0, 0, originColorImg.width, originColorImg.height)

        const TILE_SIZE_ = this.TILE_SIZE
        const OVERLAP_AREA_ = this.OVERLAP_AREA

        patchs.forEach((patchPos_, i) => {
            const targetTile = tiles[i]
            targetTile[0] *= resizeRatio
            targetTile[1] *= resizeRatio

            const TILE_SIZE = {
                w: TILE_SIZE_.w * resizeRatio, 
                h: TILE_SIZE_.h * resizeRatio
            }

            const OVERLAP_AREA = {
                w: OVERLAP_AREA_.w * resizeRatio,
                h: OVERLAP_AREA_.h * resizeRatio
            }

            const patchPos = [patchPos_[0] * resizeRatio, patchPos_[1] * resizeRatio]

            const oriPatchImgData = context.getImageData(targetTile[0], targetTile[1], TILE_SIZE.w, TILE_SIZE.h)
            const findedPatchImgData = context.getImageData(patchPos[0], patchPos[1], TILE_SIZE.w, TILE_SIZE.h)
            
            const r = 1. //(OVERLAP_AREA.w > 4) ? 4 / OVERLAP_AREA.w : 1.

//            const nextPatchImgData = this.seamPatch(oriPatchImgData, findedPatchImgData, TILE_SIZE, OVERLAP_AREA, r)
            context.putImageData(findedPatchImgData, targetTile[0], targetTile[1])
        })

        return canvas
    }

    seamPatch(originPatch, targetPatch, TILE_SIZE, OVERLAP_AREA, seam_ratio = 1.) {
        const diffPatch = []
        let pl, pr, pt, pb;

        for (let y = 0; y < TILE_SIZE.h; y++) {
          for (let x = 0; x < TILE_SIZE.w; x++) {
            const i = y * TILE_SIZE.w + x
            const i4 = i * 4

            for (let c = 0; c < 4; c++) {
              const v = Math.sqrt(Math.pow(targetPatch.data[i4 + c] - originPatch.data[i4 + c], 2))
              diffPatch.push(v)
            }

            if ((originPatch.data[i4 + 0] == 0) && (originPatch.data[i4 + 1] == 0) && (originPatch.data[i4 + 2] == 0)) {
              if(pl > x || !pl) pl = x
              if(pr < x || !pr) pr = x
              if(pt > y || !pt) pt = y
              if(pb < y || !pb) pb = y
            }
          }
        }

        //top
        if (pt > 0) {
          for(let cx = 0 ; cx < TILE_SIZE.w; cx++) {
            let minVal = -1;
            let minIdx = 0;

            for(let cy = 0 ; cy < pt; cy++) {
              const i4 = (cy * TILE_SIZE.w + cx) * 4;
              const ol = originPatch.data[i4 + 0] * 0.2126 + originPatch.data[i4 + 1] * 0.7152 + originPatch.data[i4 + 2] * 0.0722
              const tl = targetPatch.data[i4 + 0] * 0.2126 + targetPatch.data[i4 + 1] * 0.7152 + targetPatch.data[i4 + 2] * 0.0722

              const cv = Math.pow(ol - tl, 2)

              if(minVal > cv || minVal == -1) {
                minVal = cv
                minIdx = cy
              }
            }

            for (let i = 0; i < pt; i++) {
              const i4 = (i * TILE_SIZE.w + cx) * 4;
              if (i <= minIdx) {
                targetPatch.data[i4 + 0] = originPatch.data[i4 + 0]
                targetPatch.data[i4 + 1] = originPatch.data[i4 + 1]
                targetPatch.data[i4 + 2] = originPatch.data[i4 + 2]
              }
            }
          }
        }

        //right
        if (pr < TILE_SIZE.w - 1) {

          for(let cy = 0 ; cy < TILE_SIZE.h; cy++) {
            let minVal = -1;
            let minIdx = 0;

            for(let cx = pr ; cx < TILE_SIZE.w; cx++) {
              const i4 = (cy * TILE_SIZE.w + cx) * 4;
              const ol = originPatch.data[i4 + 0] * 0.2126 + originPatch.data[i4 + 1] * 0.7152 + originPatch.data[i4 + 2] * 0.0722
              const tl = targetPatch.data[i4 + 0] * 0.2126 + targetPatch.data[i4 + 1] * 0.7152 + targetPatch.data[i4 + 2] * 0.0722

              const cv = Math.pow(ol - tl, 2)

              if(minVal > cv || minVal == -1) {
                minVal = cv
                minIdx = cx
              }
            }

            for (let i = pr + 1; i < pr + OVERLAP_AREA.w; i++) {
              const i4 = (cy * TILE_SIZE.w + i) * 4;
              if (i >= minIdx) {
                targetPatch.data[i4 + 0] = originPatch.data[i4 + 0]
                targetPatch.data[i4 + 1] = originPatch.data[i4 + 1]
                targetPatch.data[i4 + 2] = originPatch.data[i4 + 2]
              }
            }
            for (let i = pr + OVERLAP_AREA.w; i < TILE_SIZE.w; i++) {
              const i4 = (cy * TILE_SIZE.w + i) * 4;
              targetPatch.data[i4 + 0] = originPatch.data[i4 + 0]
              targetPatch.data[i4 + 1] = originPatch.data[i4 + 1]
              targetPatch.data[i4 + 2] = originPatch.data[i4 + 2]
            }
          }
        }

        //bottom
        if (pb < TILE_SIZE.h - 1) {
          for(let cx = 0 ; cx < TILE_SIZE.w; cx++) {
            let minVal = -1;
            let minIdx = 0;

            for(let cy = pb ; cy < TILE_SIZE.h; cy++) {
              const i4 = (cy * TILE_SIZE.w + cx) * 4;
              const ol = originPatch.data[i4 + 0] * 0.2126 + originPatch.data[i4 + 1] * 0.7152 + originPatch.data[i4 + 2] * 0.0722
              const tl = targetPatch.data[i4 + 0] * 0.2126 + targetPatch.data[i4 + 1] * 0.7152 + targetPatch.data[i4 + 2] * 0.0722

              const cv = Math.pow(ol - tl, 2)

              if(minVal > cv || minVal == -1) {
                minVal = cv
                minIdx = cy
              }
            }

            for (let i = pb + 1; i < pb + OVERLAP_AREA.h; i++) {
              const i4 = (i * TILE_SIZE.w + cx) * 4;
            if (i >= minIdx) {
                targetPatch.data[i4 + 0] = originPatch.data[i4 + 0]
                targetPatch.data[i4 + 1] = originPatch.data[i4 + 1]
                targetPatch.data[i4 + 2] = originPatch.data[i4 + 2]
            }
            }

            for (let i = pb + OVERLAP_AREA.h; i < TILE_SIZE.h; i++) {
              const i4 = (i * TILE_SIZE.w + cx) * 4;
              targetPatch.data[i4 + 0] = originPatch.data[i4 + 0]
              targetPatch.data[i4 + 1] = originPatch.data[i4 + 1]
              targetPatch.data[i4 + 2] = originPatch.data[i4 + 2]
            }
          }
        }

        //left
        if (pl > 0) {
          for(let cy = 0 ; cy < TILE_SIZE.h; cy++) {
            let minVal = -1;
            let minIdx = 0;

            for(let cx = 0 ; cx < pl; cx++) {
              const i4 = (cy * TILE_SIZE.w + cx) * 4;
              const ol = originPatch.data[i4 + 0] * 0.2126 + originPatch.data[i4 + 1] * 0.7152 + originPatch.data[i4 + 2] * 0.0722
              const tl = targetPatch.data[i4 + 0] * 0.2126 + targetPatch.data[i4 + 1] * 0.7152 + targetPatch.data[i4 + 2] * 0.0722

              const cv = Math.pow(ol - tl, 2)

              if(minVal > cv || minVal == -1) {
                minVal = cv
                minIdx = cx
              }
            }

            for (let i = 0; i < pl; i++) {
              const i4 = (cy * TILE_SIZE.w + i) * 4;
              if (i <= minIdx) {
                targetPatch.data[i4 + 0] = originPatch.data[i4 + 0]
                targetPatch.data[i4 + 1] = originPatch.data[i4 + 1]
                targetPatch.data[i4 + 2] = originPatch.data[i4 + 2]
              }
            }
          }
        }
        return targetPatch
    }

    cloneImageData(target) {
        const canvas = document.createElement('canvas')
        canvas.width = target.width
        canvas.height = target.height
        const context = canvas.getContext('2d')

        context.drawImage(target, 0, 0, target.width, target.height)
        return context.getImageData(0, 0, target.width, target.height)
    }

    nextPatch(srcImgData, resultImgData, targetTile, samplingSides) {
        const { evaluation } = this.data

        const randoms = this.getRandomPatchPositions(samplingSides)
        return new Promise((resolve) => {
            
            const startTime = new Date()
            const result = evaluation(srcImgData, resultImgData, randoms, targetTile);

            let minVal = 1000000000;
            let minIdx = -1;
            for (let i = 0; i < result.length; i++) {
                if(minVal > result[i]) {
                    minVal = result[i]
                    minIdx = i
                }
            }

            resolve(randoms[minIdx])
        })
    }

    getTilePositions(targetArea) {
        
        const { TILE_SIZE, OVERLAP_AREA } = this

        const rowCount = parseInt(targetArea.w / (TILE_SIZE.w - OVERLAP_AREA.w)) + 1
        const colCount = parseInt(targetArea.h / (TILE_SIZE.h - OVERLAP_AREA.h)) + 1

        const tiles = []

//        this.getRadialPoints()

        for (let c = 0; c < colCount; c++) {
            for (let r = 0; r < rowCount; r++) {
            const x = targetArea.x + r * TILE_SIZE.w - OVERLAP_AREA.w * (r + 1)
            const y = targetArea.y + c * TILE_SIZE.h - OVERLAP_AREA.h * (c + 1)

            tiles.push([x, y])
            }
        }

        return tiles
    }

    genEvaluation(img) {
        const { ITER_COUNT, TILE_SIZE, OVERLAP_AREA } = this
        const gpu = new GPU()
        const evaluation = gpu.createKernel(function(src, res, rands, target) {
            const j = this.thread.x;
            const ROIColorR = this.constants.ROIColorR;
            const ROIColorG = this.constants.ROIColorG;
            const ROIColorB = this.constants.ROIColorB;
    
            let sum = 0;
            for (let y_ = 0; y_ < this.constants.h; y_++) {
              for (let x_ = 0; x_ < this.constants.w; x_++) {
                const tx = target[0] + x_;
                const ty = target[1] + y_;
                const ti = ty * this.constants.width + tx;
                const ti4 = ti * 4;
                const tr = res[ti4 + 0];
                const tg = res[ti4 + 1];
                const tb = res[ti4 + 2];
    
                const rx = rands[j][0] + x_;
                const ry = rands[j][1] + y_;
                const ri = ry * this.constants.width + rx;
                const ri4 = ri * 4;
                const rr = src[ri4 + 0];
                const rg = src[ri4 + 1];
                const rb = src[ri4 + 2];
    
                const len = Math.sqrt(Math.pow(tr - ROIColorR, 2) + Math.pow(tg - ROIColorG, 2) + Math.pow(tb - ROIColorB, 2))
                if (len > 1) {
                  const targetLumi = tr * 0.2126 + tg * 0.7152 + tb * 0.0722;
                  const randomLumi = rr * 0.2126 + rg * 0.7152 + rb * 0.0722;
                  sum += Math.sqrt(Math.pow(targetLumi - randomLumi, 2));
                }
              }
            }
    
            return sum;
          }, {
            constants: {
                w: TILE_SIZE.w,
                h: TILE_SIZE.h,
                width: img.width,
                ROIColorR: 0,
                ROIColorG: 0,
                ROIColorB: 0
            },
            output: [ITER_COUNT]
          });

          return evaluation
    }

    getReady(img, edgeResizeRatio) {
        return new Promise((resolve) => {
            const { edgeDetector } = this
            const originTargetArea = this.getTargetArea(img)

            this.resizeImage(img, edgeResizeRatio)
                .then((resizeImg) => {
                    edgeDetector.detect(resizeImg)
                    .then((edgeResizeImg) => {
                        const edgeTargetArea = this.getTargetArea(resizeImg)
            
                        this.fillTargetArea(img, originTargetArea, '#000')
                        .then( (originColorImg) => {
                            this.fillTargetArea(edgeResizeImg, edgeTargetArea, '#000')
                            .then( (edgeResizeColorImg) => {
                                this.fillTargetArea(resizeImg, edgeTargetArea, '#000')
                                .then( (resizeColorImg) => {
                                    this.data = {
                                        originImg: img,
                                        originColorImg,
                                        resizeImg,
                                        resizeColorImg,
    
                                        edgeResizeImg,
                                        edgeResizeColorImg,
        
                                        originTargetArea,
                                        edgeTargetArea,
        
                                        evaluation: this.genEvaluation(edgeResizeColorImg)
                                    }
                                    
                                    resolve(this.data)
                                })
                            })
                        })
                    })
        
                })
            
        })
    }

    getRandomPatchPositions() {
      const { ITER_COUNT, TILE_SIZE, OVERLAP_AREA  } = this
      const img = this.data.edgeResizeColorImg
      const targetArea = this.data.edgeTargetArea

      const { width, height } = img

      const randoms = []
      for(let i = 0; i < ITER_COUNT; i++) {

        const side = Math.random()

        let x = 0;
        let y = 0;
        if(side < 0.25) { //top
          x = parseInt(Math.random() * (width - TILE_SIZE.w));
          y = parseInt(Math.random() * (targetArea.y - TILE_SIZE.h));
        } else if(side < 0.5) { //right
          const w_ = targetArea.x + targetArea.w
          x = parseInt(w_ + Math.random() * (width - w_ - TILE_SIZE.w));
          y = parseInt(Math.random() * (targetArea.y - TILE_SIZE.h));
        } else if(side < 0.75) { //bottom
          const h_ = targetArea.y + targetArea.h
          x = parseInt(Math.random() * (width - TILE_SIZE.w));
          y = parseInt(h_ + Math.random() * (height - h_ - TILE_SIZE.h));
        } else { //left
          x = parseInt(Math.random() * (targetArea.x - TILE_SIZE.w));
          y = parseInt(Math.random() * (height - TILE_SIZE.h));
        }

        randoms.push([x, y])
      }
      return randoms
  }

    getRandomPatchPositions_(samplingSides) {
        const { ITER_COUNT, TILE_SIZE, OVERLAP_AREA  } = this
        const img = this.data.edgeResizeColorImg
        const targetArea = this.data.edgeTargetArea

        const { width, height } = img

        samplingSides = samplingSides ? samplingSides : [0, 1, 2, 3]

        const randoms = []
        for(let i = 0; i < ITER_COUNT; i++) {
  
          const side = Math.random()
  
          let x = 0;
          let y = 0;

          const w_ = targetArea.x + targetArea.w
          const h_ = targetArea.y + targetArea.h
          
          const rands = []

          //top
          if(samplingSides.findIndex((d) => d == 0) != -1) {
            rands.push([
              parseInt(Math.random() * (width - TILE_SIZE.w)),
              parseInt(Math.random() * (targetArea.y - TILE_SIZE.h)), 
            ])
          }

          //right
          if(samplingSides.findIndex((d) => d == 1) != -1) {
            rands.push([
              parseInt(w_ + Math.random() * (width - w_ - TILE_SIZE.w)),
              parseInt(Math.random() * (targetArea.y - TILE_SIZE.h)), 
            ])
          }
          
          //bottom
          if(samplingSides.findIndex((d) => d == 2) != -1) {
            rands.push([
              parseInt(Math.random() * (width - TILE_SIZE.w)),
              parseInt(h_ + Math.random() * (height - h_ - TILE_SIZE.h)), 
            ])
          }
          
          //left
          if(samplingSides.findIndex((d) => d == 3) != -1) {
            rands.push([
              parseInt(Math.random() * (targetArea.x - TILE_SIZE.w)),
              parseInt(Math.random() * (height - TILE_SIZE.h)), 
            ])
          }
          
          const pos = rands[parseInt(Math.random() * 10 % rands.length)]
          randoms.push(pos)
        }
        return randoms
    }

    fillTargetArea(img, targetArea, color) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const context = canvas.getContext('2d')
            
            context.drawImage(img, 0, 0, img.width, img.height)
            context.fillStyle = color
            context.fillRect(targetArea.x, targetArea.y, targetArea.w, targetArea.h)
            
            const nextImg = new Image()
            nextImg.src = canvas.toDataURL()
            nextImg.onload = () => {
                resolve(nextImg)
            }
        })
    }

    resizeImage(img, resizeRatio) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width * resizeRatio
            canvas.height = img.height * resizeRatio
            const context = canvas.getContext('2d')
    
            context.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)
    
            const nextImg = new Image()
            nextImg.src = canvas.toDataURL()
            nextImg.onload = () => {
                resolve(nextImg)
            }
        })
    }

    getTargetArea(img) {
        const width = img.width
        const height = img.height
        const srcCanvas = document.createElement('canvas')
        srcCanvas.width = width
        srcCanvas.height = height
        const srcContext = srcCanvas.getContext('2d')
        srcContext.drawImage(img, 0, 0)
        const srcImgData = srcContext.getImageData(0, 0, width, height).data

        let left = width
        let top = height
        let right = 0
        let bottom = 0
  
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const i4 = i * 4;
  
            const l = Math.sqrt(Math.pow(srcImgData[i4 + 0] - 0, 2) + Math.pow(srcImgData[i4 + 1] - 255, 2) + Math.pow(srcImgData[i4 + 2] - 0, 2), 2)
            if(l < 4) {
              if(left > x) {
                left = x;
              }
              if(right < x) {
                right = x;
              }
              if(top > y) {
                top = y;
              }
              if(bottom < y) {
                bottom = y;
              }
            }
          }
        }
  
        return {
            x: left,
            y: top,
            w: right - left + 1,
            h: bottom - top + 1
          }        
    }

    getRadialTilePositions(targetArea) {
      const { TILE_SIZE, OVERLAP_AREA } = this

      console.log(targetArea, TILE_SIZE, OVERLAP_AREA)
      
      const colCount = Math.ceil((targetArea.w) / (TILE_SIZE.w - OVERLAP_AREA.w)) + 1
      const rowCount = Math.ceil((targetArea.h) / (TILE_SIZE.h - OVERLAP_AREA.h))
    
      const points = []
      
      let i = 0;
      let ri = colCount
      let ci = rowCount
      
      let size = rowCount + colCount
    
      let dx = 1, dy = 1
      let cursor = [-(TILE_SIZE.w - OVERLAP_AREA.w) - OVERLAP_AREA.w, - OVERLAP_AREA.h]
      let boxCount = 0
      for (let i = 0; i < size; i++) {
        if (!(i%2)) {
          const dx_ = dx
          const dy_ = 0
      
          for (let j = 0; j < ri; j++) {
            cursor[0] += dx_ * (TILE_SIZE.w - OVERLAP_AREA.w)
            
            const x = targetArea.x + cursor[0]
            const y = targetArea.y + cursor[1]
            points.push([x, y])
            boxCount++      
          }
          
          dx *= -1
          ri--
        } else {
          const dy_ = dy
          const dx_ = 0
      
          for (let j = 0; j < ci; j++) {
            cursor[1] += dy_ * (TILE_SIZE.h - OVERLAP_AREA.h)
            
            const x = targetArea.x + cursor[0]
            const y = targetArea.y + cursor[1]
            points.push([x, y])
      
            boxCount++
          }
          
          dy *= -1
          ci--
        }
      }
      
      return points
    }
    
}

export default TextureSynthesis
