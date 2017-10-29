
const srcImg = new Image()
srcImg.src = './resources/train.jpg'

const targetImg = new Image()
targetImg.src = './resources/train.jpg'

setTimeout(() => {
    const width = srcImg.width
    const height = srcImg.height

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')

    context.drawImage(srcImg, 0, 0)
    const srcImageData = context.getImageData(0, 0, width, height)

    context.drawImage(targetImg, 0, 0)
    const targetImageData = context.getImageData(0, 0, width, height)

    const srcDomiColor = [0, 0, 0]
    const targetDomiColor = [0, 0, 0]
    const valueImageData = context.getImageData(0, 0, width, height)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4
            
            for (let j = 0; j < 3; j++) {
                srcDomiColor[i + j] += srcImageData.data[i + j] 
                targetDomiColor[i + j] += targetImageData.data[i + j] 

                valueImageData.data[i + j] = (targetImageData.data[i + j] - srcImageData.data[i + j])
            }
        }
    }

    const cVec = [0, 0, 0]    
    
    for (let j = 0; j < 3; j++) {
        srcDomiColor[j] /= width * height
        srcDomiColor[j] /= 255.

        targetDomiColor[j] /= width * height
        targetDomiColor[j] /= 255.

        cVec[j] = srcDomiColor[j] - targetDomiColor[j]
    }

    const TRY_COUNT = 100
    let count = 50
    
    const resultImageData = context.getImageData(0, 0, width, height)
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4

            for (let j = 0; j < 3; j++) {
                resultImageData.data[i + j] = 0;//srcImageData.data[i + j] + (count / TRY_COUNT) * valueImageData[i + j]
            }

            resultImageData.data[i + 3] = 255
        }
    }

    context.putImageData(resultImageData, width, height / 2)

    document.body.appendChild(canvas)
}, 100)