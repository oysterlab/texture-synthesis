import TextureSynthesis from './TextureSynthesis'

const startTime = new Date()
const oriImg = new Image()
oriImg.src = 'resources/real_wall_resize.jpg'
oriImg.onload = () => {

  const ts1 = new TextureSynthesis()


  const r = 512 / oriImg.width
  
    ts1.synthesis(oriImg, r, {
      radial: false,
      withEdge: false,
      debug: true
    }).then((result) => {

      ts1.TILE_SIZE.w = 60
      ts1.TILE_SIZE.h = 60
      document.body.appendChild(result)
  
      console.log( ((new Date()) - startTime) / 1000 + 's')
    })

  // const r = 512 / oriImg.width
  // ts.resizeImage(oriImg, r).then((resizedImg) => {
  //   const targetArea = ts.getTargetArea(resizedImg)
  //   ts.edgeDetector.detect(resizedImg).then((img) => {
        
  //       //top
  //       let fromX = 1
  //       let toX = img.width
  //       let fromY = 0
  //       let toY = fromY + 1
  //       const scanTopPatchSize = {
  //         x: 0,
  //         y: 0,
  //         w: targetArea.x,
  //         h: targetArea.y
  //       }
  //       const scanTopSrcPatch = cloneImageDataWithRange(img, scanTopPatchSize.x, scanTopPatchSize.y, scanTopPatchSize.w, scanTopPatchSize.h)
        
  //       const topBlocks = scanPattern(img, scanTopSrcPatch, scanTopPatchSize, fromX, toX, fromY, toY)
  
  //       //right
  //       fromX = targetArea.x + targetArea.w
  //       toX = fromX + 1
  //       fromY = 1
  //       toY = img.height
  //       const scanRightPatchSize = {
  //         x: (targetArea.x + targetArea.w),
  //         y: 0,
  //         w: img.width - (targetArea.x + targetArea.w),
  //         h: targetArea.y
  //       }
  //       const scanRightSrcPatch = cloneImageDataWithRange(img, scanRightPatchSize.x, scanRightPatchSize.y, scanRightPatchSize.w, scanRightPatchSize.h)
        
  //       const rightBlocks = scanPattern(img, scanRightSrcPatch, scanRightPatchSize, fromX, toX, fromY, toY)
  
  //       //bottom
  //       fromX = 1
  //       toX = img.width
  //       fromY = targetArea.y + targetArea.h
  //       toY = fromY + 1
  //       const scanBottomPatchSize = {
  //         x: 0,
  //         y: targetArea.y + targetArea.h,
  //         w: targetArea.x,
  //         h: img.height - (targetArea.y + targetArea.h)
  //       }
  //       const scanBottomSrcPatch = cloneImageDataWithRange(img, scanBottomPatchSize.x, scanBottomPatchSize.y, scanBottomPatchSize.w, scanBottomPatchSize.h)
        
  //       const bottomBlocks = scanPattern(img, scanBottomSrcPatch, scanBottomPatchSize, fromX, toX, fromY, toY)
  
  //       //left
  //       fromX = 0
  //       toX = fromX + 1
  //       fromY = 1
  //       toY = img.height
  //       const scanLeftPatchSize = scanTopPatchSize
  //       const scanLeftSrcPatch = cloneImageDataWithRange(img, scanLeftPatchSize.x, scanLeftPatchSize.y, scanLeftPatchSize.w, scanLeftPatchSize.h)
        
  //       const leftBlocks = scanPattern(img, scanLeftSrcPatch, scanLeftPatchSize, fromX, toX, fromY, toY)
      
      
      
      
  //       //debug
      
  //       const canvas = document.createElement('canvas')
  //       canvas.width = img.width
  //       canvas.height = img.height
  //       document.body.appendChild(canvas)
        
  //       const context = canvas.getContext('2d')
      
  //       context.drawImage(img, 0, 0)
      
  //       // context.fillStyle = 'rgba(0, 255, 0, 0.3)' 
  //       // context.fillRect(scanTopPatchSize.x, scanTopPatchSize.y, scanTopPatchSize.w, scanTopPatchSize.h)
  
  //       // context.fillStyle = 'rgba(0, 255, 0, 0.3)' 
  //       // context.fillRect(scanRightPatchSize.x, scanRightPatchSize.y, scanRightPatchSize.w, scanRightPatchSize.h)
        
  //       // context.fillStyle = 'rgba(0, 255, 0, 0.3)' 
  //       // context.fillRect(scanBottomPatchSize.x, scanBottomPatchSize.y, scanBottomPatchSize.w, scanBottomPatchSize.h)
        
  //       // context.fillStyle = 'rgba(0, 255, 0, 0.3)' 
  //       // context.fillRect(scanLeftPatchSize.x, scanLeftPatchSize.y, scanLeftPatchSize.w, scanLeftPatchSize.h)
        
  //       // for (let i = 0; i < 20; i++) {
  //       //   //top
  //       //   context.fillStyle = 'rgba(255, 0, 0, 0.3)' 
  //       //   context.fillRect(topBlocks[i].x, topBlocks[i].y, topBlocks[i].w, topBlocks[i].h)
  
  //       //   //right
  //       //   context.fillStyle = 'rgba(0, 0, 255, 0.3)' 
  //       //   context.fillRect(rightBlocks[i].x, rightBlocks[i].y, rightBlocks[i].w, rightBlocks[i].h)
  
  //       //   //bottom
  //       //   context.fillStyle = 'rgba(255, 0, 0, 0.3)' 
  //       //   context.fillRect(bottomBlocks[i].x, bottomBlocks[i].y, bottomBlocks[i].w, bottomBlocks[i].h)
  
  //       //   //left
  //       //   context.fillStyle = 'rgba(0, 0, 255, 0.3)' 
  //       //   context.fillRect(leftBlocks[i].x, leftBlocks[i].y, leftBlocks[i].w, leftBlocks[i].h)
  //       // }
  //   })
  // })
}

function scanPattern(img, srcPatch, scanSize, fromX, toX, fromY, toY) {
  const blocks = []

  const { w, h } = scanSize

  for(let y = fromY; y < toY; y++) {
    for(let x = fromX; x < toX; x++) {
      const compPatch = cloneImageDataWithRange(img, x, y, w, h)
      const cost = getDiffCost(srcPatch, compPatch)
  
      blocks.push({
        x, y,
        w, h,
        cost
      })
    }
  }

  blocks.sort((a, b) => a.cost - b.cost) 
  return blocks
}

function getDiffCost(src, comp) {
  let cost = 0
  for (let i = 0; i < src.length; i++) {
    cost += Math.sqrt(Math.pow((src[i] - comp[i]), 2))
  }
  cost /= src.length
  return cost
}

function cloneImageDataWithRange(target, x, y, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const context = canvas.getContext('2d')

  context.drawImage(target, 0, 0, target.width, target.height)
  return context.getImageData(x, y, w, h).data
}