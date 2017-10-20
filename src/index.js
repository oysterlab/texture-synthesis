import TextureSynthesis from './TextureSynthesis'

const startTime = new Date()
const img = new Image()
img.src = 'resources/3.jpg'
img.onload = () => {
  const ts1 = new TextureSynthesis()

  const r = 512 / img.width

  ts1.synthesis(img, r, {
    radial: true,
    withEdge: true,
    debug: true
  }).then((result) => {
    document.body.appendChild(result)

    console.log( ((new Date()) - startTime) / 1000 + 's')
  })

  const ts2 = new TextureSynthesis()
  
  ts2.synthesis(img, r, {
    radial: false,
    withEdge: true,
    debug: true
  }).then((result) => {
    document.body.appendChild(result)

    console.log( ((new Date()) - startTime) / 1000 + 's')
  })
}


// const targetArea = {
//   w: 273,
//   h: 154,
//   x: 123,
//   y: 75
// }
// const TILE_SIZE = {w: 30, h: 30}
// const OVERLAP_AREA = {w: 12, h: 12}

// const points = getRadialPoints(targetArea)

// points.forEach((p, i) => {
//   drawBox(p[0], p[1], i)
// })

// function drawBox(x, y, i) {
//   const box = document.createElement('div')    
//   box.style.width = `${TILE_SIZE.w}px`
//   box.style.height = `${TILE_SIZE.h}px`
//   box.style.border = '1px solid #0f0'
//   box.style.position = 'absolute'
//   box.style.fontSize = '10px'
//   box.style.color = '#0f0'

//   box.style.top = `${y}px`
//   box.style.left = `${x}px`

//   box.innerHTML = i
//   i++

//   document.body.appendChild(box)  
// }


// function getRadialPoints(targetArea) {
  
//   const colCount = Math.ceil((targetArea.w) / (TILE_SIZE.w - OVERLAP_AREA.w))
//   const rowCount = Math.ceil((targetArea.h) / (TILE_SIZE.h - OVERLAP_AREA.h))

//   const points = []
  
//   let i = 0;
//   let ri = colCount
//   let ci = rowCount
  
//   let size = rowCount + colCount

//   let dx = 1, dy = 1
//   let cursor = [-(TILE_SIZE.w - OVERLAP_AREA.w) - OVERLAP_AREA.w, - OVERLAP_AREA.h]
//   let boxCount = 0
//   for (let i = 0; i < size; i++) {
//     if (!(i%2)) {
//       const dx_ = dx
//       const dy_ = 0
  
//       for (let j = 0; j < ri; j++) {
//         cursor[0] += dx_ * (TILE_SIZE.w - OVERLAP_AREA.w)
        
//         const x = targetArea.x + cursor[0]
//         const y = targetArea.y + cursor[1]
//         points.push([x, y])
//         boxCount++      
//       }
      
//       dx *= -1
//       ri--
//     } else {
//       const dy_ = dy
//       const dx_ = 0
  
//       for (let j = 0; j < ci; j++) {
//         cursor[1] += dy_ * (TILE_SIZE.h - OVERLAP_AREA.h)
        
//         const x = targetArea.x + cursor[0]
//         const y = targetArea.y + cursor[1]
//         points.push([x, y])
  
//         boxCount++
//       }
      
//       dy *= -1
//       ci--
//     }
//   }
  
//   return points
// }