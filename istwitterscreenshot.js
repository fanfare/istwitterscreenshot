// https://github.com/fanfare/istwitterscreenshot
// by fanfare ~ http://jollo.org/LNT/home/fanfare
// istwitterscreenshot v0.0.1

const Istwitterscreenshot = function(config) {

  const promises = {}
  const times = {}
  
  const outbound = {
    id: null,
    thumb: null,
    fullsize: null
  }
  
  const worker = new Worker('./ocrad-worker.js')
  
  let uid = 0
  let debug = 0
  
  let headerHeight = 38
  let headerWidthDivisor = 6
  
  if (config && config.debug === 1) {
    debug = 1
  }
  
  function Queue(method) {
    this.method = method
    this.pool = []
    this.working = false
    this.resume = () => {
      if (this.pool.length > 0) {
        this.working = true
        let args = this.pool.shift()
        this.method(args)
      }
      else {
        this.working = false
      }      
    }
    this.push = (item) => {
      this.pool.push(item)
      if (!this.working) {
        this.working = true
        this.resume()
      }
    }
  }
  
  const response = function(id, result, details) {
    let newtime = performance.now()
    let oldtime = times[id]
    let elapsed = newtime - oldtime
    details.time = elapsed
    details.result = result
    let response = !debug ? result : {result, details}
    promises[id].resolve(response)
    delete times[id]
    delete promises[id]
    return null
  }
  
  const ocradresponse = function(id, text, details) {
    if (!debug || debug <= 0) {
      URL.revokeObjectURL(details.ocrad.fullsize.url)
    }
    if (text) {
      let lowercase = text.toLowerCase()
      let wordmatch = false
      if (lowercase.indexOf("@") > -1) {
        wordmatch = "@" 
      }
      else if (lowercase.indexOf("tweet") > -1) {
        wordmatch = "tweet"          
      }
      else if (lowercase.indexOf("echobox") > -1) {
        wordmatch = "echobox"          
      }
      else if (lowercase.indexOf("hootsuite") > -1) {
        wordmatch = "hootsuite"         
      }
      else if (lowercase.indexOf("sprinklr") > -1) {
        wordmatch = "sprinklr"          
      }
      else if (lowercase.indexOf("replying") > -1) {
        wordmatch = "replying"          
      }
      else if (lowercase.indexOf("twitter") > -1) {
        wordmatch = "twitter"           
      }
      else if (lowercase.indexOf("socialflow") > -1) {
        wordmatch = "socialflow"        
      }
      else if (lowercase.indexOf("twltter") > -1) {
        wordmatch = "twLtter"
      }
      details.ocrad.word = wordmatch
      details.ocrad.text = text
      response(id, !!wordmatch, details)
    }
    else {
      details.ocrad.word = null
      details.ocrad.text = null
      response(id, false, details)
    }
    setTimeout(()=>{
      workerqueue.resume()
    },0)
  }
  
  const evalthumb = function(thumb) {
    let details = {}
    details.ocrad = {}
    details.ocrad.fullsize = {}
    details.exit = false
    details.guess = null
    details.lastEvaluation = "init"
    details.evaluations = {}
    details.thumb = {}
    let canvas = document.createElement("canvas")
    let ctx = canvas.getContext("2d")
    let width = thumb.width
    let height = thumb.height
    let prefilter = "none"
    if (width > 250) {
      width = 250
      height = Math.floor( (250/thumb.width) * height )
      details.thumb.resized = "reduced"
    }
    else if (width < 220) {
      width = 220
      height = Math.floor( (220/thumb.width) * height )
      details.thumb.resized = "enlarged"
      if (width < 80) {
        prefilter = "contrast(140%)"
      }
      else if (width < 160) {
        prefilter = "contrast(120%)"
      }
    }
    canvas.width = width
    canvas.height = height
    ctx.filter = prefilter
    ctx.drawImage(thumb,0,0,thumb.width,thumb.height,0,0,width,height)
    details.thumb.width = width
    details.thumb.height = height
    let cce
    
    function evalcropif() {
      details.lastEvaluation = "crop"
      details.evaluations.crop = {}
      let crop = details.evaluations.crop
      function bgcolortest(r,g,b) {
        let colsum = r + g + b
        let desaturated = 
          Math.abs(r - g) < 16 && 
          Math.abs(g - b) < 16 && 
          Math.abs(r - b) < 16
        if ( colsum > 680 && desaturated ) {
          return "white"
        }
        else if (
             r > 0  && r < 70
          && g > 10 && g < 80
          && b > 20 && b < 90
          && g > r ) {
          return "blue"
        }
        else if ( colsum < 100 && desaturated )  {
          return "black"
        }
        else {
          return null
        }
      }  
      function bgcolorpick(x,y) {
        const color = ctx.getImageData(x,y,1,1).data
        const r = color[0]
        const g = color[1]
        const b = color[2]
        return bgcolortest(r,g,b)
      }
      let switchcount = 0
      let peak = height < headerHeight ? height : headerHeight
      let whitecount = 0
      let bluecount = 0
      let blackcount = 0
      let nocount = 0
      let baseline = null
      for (let y=0;y<peak;y++) {
        for (let x=0;x<width;x++) {
          let test = bgcolorpick(x,y)
          if (test === "white") {
            whitecount++
          }
          else if (test === "blue") {
            bluecount++
          }
          else if (test === "black") {
            blackcount++
          }
          else {
            nocount++
          }
        }
      }
      let predom = null
      if (whitecount > nocount && whitecount > blackcount && whitecount > bluecount) {
        predom = "white"
      }
      else if (blackcount > nocount && blackcount > whitecount && blackcount > bluecount) {
        predom = "black"
      
      }
      else if (bluecount >= nocount && bluecount >= whitecount && bluecount >= blackcount) {
        predom = "blue"
      }
      else {
        predom = "none"
      }
      crop.predominantColor = predom
      if (predom === "none") {
        return null
      }
      let offsettop = 0
      let forty = Math.floor(width/40)
      let hex = Math.floor(width/6)
      for (let y=0;y<peak;y++) {
        let testscan = 0
        for (let x=1;x<40;x++) {
          let test = bgcolorpick(x*forty,y)
          if (test !== predom) {
            testscan++
          }
          else {
            break
          }
        }
        if (testscan !== 39) {
          break
        }
        else {
          offsettop++
        }
      }
      let offsetleft = 0
      for (let x=0;x<hex;x++) {
        let testscan = 0
        for (let y=1;y<40;y++) {
          let test = bgcolorpick(x,y*forty)
          if (test !== predom) {
            testscan++
          }
          else {
            break
          }
        }
        if (testscan !== 39) {
          break
        }
        else {
          offsetleft++
        }
      }
      let offsetright = 0
      for (let x = width - 1; x >= width - hex - 1; x--) {
        let testscan = 0
        for (let y=1;y<40;y++) {
          let test = bgcolorpick(x,y*forty)
          if (test !== predom) {
            testscan++
          }
          else {
            break
          }
        }
        if (testscan !== 39) {
          break
        }
        else {
          offsetright++
        }
      }
      crop.offsetTop = offsettop
      crop.offsetLeft = offsetleft
      crop.offsetRight = offsetright
      if (offsettop > 0 || offsetleft > 0 || offsetright > 0) {
        let newcanvas = document.createElement("canvas")
        let newctx = newcanvas.getContext("2d")
        let newwidth = canvas.width - offsetleft - offsetright
        let newheight = canvas.height - offsettop
        newcanvas.width = newwidth
        newcanvas.height = newheight
        newctx.drawImage(canvas, (offsetleft * -1), (offsettop * -1))
        canvas = newcanvas
        ctx = newctx
        width = newwidth
        height = newheight
      }
      
    }

    evalcropif()
      
    function evaltrimif() {
      details.lastEvaluation = "trim"
      details.evaluations.trim = {}
      let trim = details.evaluations.trim
      function bgcolortest(r,g,b) {
        let colsum = r + g + b
        let desaturated = 
          Math.abs(r - g) < 16 && 
          Math.abs(g - b) < 16 && 
          Math.abs(r - b) < 16
        if ( colsum > 680 && desaturated ) {
          return "white"
        }
        else if (
             r > 0  && r < 70
          && g > 10 && g < 80
          && b > 20 && b < 90
          && g > r ) {
          return "blue"
        }
        else if ( colsum < 100 && desaturated )  {
          return "black"
        }
        else {
          return null
        }
      }  
      function bgcolorpick(x,y) {
        const color = ctx.getImageData(x,y,1,1).data
        const r = color[0]
        const g = color[1]
        const b = color[2]
        return bgcolortest(r,g,b)
      }
      let bg = bgcolorpick(0,0)
      let fifth = Math.floor(width/5)
      let leftclear = 0
      for (let x=0;x<fifth;x++) {
        let clean = true
        for (let y=0;y<height;y++) {
          let color = bgcolorpick(x,y)
          if (color !== bg) {
            clean = false
            break
          }
        }
        if (!clean) {
          break
        }
        leftclear++
      }
      trim.left = leftclear
      let rightclear = 0
      for (let x=width-1;x>=(fifth*4);x--) {
        let clean = true
        for (let y=0;y<height;y++) {
          let color = bgcolorpick(x,y)
          if (color !== bg) {
            clean = false
            break
          }
        }
        if (!clean) {
          break
        }
        rightclear++
      }
      trim.right = rightclear
      let topclear = 0
      let peak = Math.floor(height/4)
      for (let y=0;y<peak;y++) {
        let clean = true
        for (let x=0;x<width;x++) {
          let color = bgcolorpick(x,y)
          if (color !== bg) {
            clean = false
            break
          }
        }
        if (!clean) {
          break
        }
        topclear++
      }
      trim.top = topclear
      let bottomclear = 0
      for (let y=height-1;y>=peak;y--) {
        let clean = true
        for (let x=0;x<width;x++) {
          let color = bgcolorpick(x,y)
          if (color !== bg) {
            clean = false
            break
          }
        }
        if (!clean) {
          break
        }
        bottomclear++
      }
      trim.bottom = bottomclear
      
      if (trim.bottom > 4 || trim.top > 4 || trim.left > 4 || trim.right > 4) {
        let willtrimleft = trim.left > 4 ? trim.left - 4 : 0
        let willtrimtop = trim.top > 4 ? trim.top - 4 : 0
        let willtrimright = trim.right > 4 ? trim.right - 4 : 0
        let willtrimbottom = trim.bottom > 4 ? trim.bottom - 4 : 0
        let newwidth = width - willtrimleft - willtrimright
        let newheight = height - willtrimtop - willtrimbottom
        let newcanvas = document.createElement("canvas")
        let newctx = newcanvas.getContext("2d")
        newcanvas.width = newwidth
        newcanvas.height = newheight
        newctx.drawImage(canvas, (willtrimleft * -1), (willtrimtop * -1))
        canvas = newcanvas
        ctx = newctx
        width = newwidth
        height = newheight
        trim.newWidth = width
        trim.newHeight = height
      }
      details.thumb.newWidth = width
      details.thumb.newHeight = height
    }

    evaltrimif()
      
    if (debug > 0) {
      details.thumb.debugCanvas = document.createElement("canvas")
      details.thumb.debugContext = details.thumb.debugCanvas.getContext("2d")
      details.thumb.debugCanvas.width = width
      details.thumb.debugCanvas.height = height
      cce = details.thumb.debugContext
      cce.drawImage(canvas,0,0)
    }
    
    function draw(x,y,color) {
      if (debug > 0) {
        cce.fillStyle = color
        cce.fillRect(x,y,1,1)
      }
    }
    
    function evaltextcolor() {
      details.lastEvaluation = "textcolor"
      details.evaluations.textcolor = {}
      let textcolor = details.evaluations.textcolor
      function scan(x,y,w,h) {
        let imagedata = ctx.getImageData(
          x, y, w, h
        )
        if (debug > 0) {
          cce.fillStyle = "lime"
          cce.fillRect(x,y,1,h)
          cce.fillRect(x,y,w,1)
          cce.fillRect(x+w-1,y,1,h)
        }
        let data = imagedata.data
        let whitecount = 0
        let blackcount = 0
        let bluecount = 0
        let lightdesaturatedcount = 0
        let darkdesaturatedcount = 0
        let allcount = 0
        let nocount = 0
        let desat = 8
        for (let i=0;i<data.length;i+=4) {
          let r = data[i]
          let g = data[1+i]
          let b = data[2+i]
          let colsum = r + g + b
          let desaturated = 
            Math.abs(r - g) < desat && 
            Math.abs(g - b) < desat && 
            Math.abs(r - b) < desat
          let saturated = 
            Math.abs(r - g) >= 9 && 
            Math.abs(g - b) >= 9 && 
            Math.abs(r - b) >= 9
          allcount++
          if (colsum > 710 && desaturated) {
            whitecount++
          }
          else if (
               r > 0  && r < 50
            && g > 10 && g < 60
            && b > 20 && b < 70
            && g > r) {
            bluecount++
          }          
          else if (colsum < 140 && desaturated) {
            blackcount++
          }
          else {
            nocount++
          }
        }
        let primarycolor
        let primarycount
        let primaryratio
        if (whitecount > 0 && whitecount > nocount && whitecount > blackcount && whitecount > bluecount) {
          primarycolor = "white"
          primarycount = whitecount
        }
        else if (blackcount > 0 && blackcount > bluecount && blackcount > nocount && blackcount > whitecount) {
          primarycolor = "black"
          primarycount = blackcount
        }
        else if (bluecount >= 0 && bluecount >= blackcount && bluecount >= nocount && bluecount >= whitecount) {
          primarycolor = "blue"
          primarycount = bluecount
        }
        else {
          primarycolor = null
          primarycount = null
        }
        if (primarycount) {
          primaryratio = primarycount/allcount
        }
        else {
          primaryratio = null
        }
        let noratio = 0
        if (primarycolor === "white" || primarycolor === "black") {
          noratio = (nocount + bluecount) / allcount
        }
        else {
          noratio = nocount/allcount
        }
        return {
          primaryColor: primarycolor,
          primaryCount: primarycount,
          primaryRatio: primaryratio,
          allCount: allcount,
          whiteCount: whitecount,
          blackCount: blackcount,
          blueCount: bluecount,
          noCount: nocount,
          noRatio: noratio,
        }
      }
      
      let footer = null
      let peak = height < 50 ? height : 50
      let header = scan(Math.floor(width * (1/6)), 4, (Math.floor(width * (5/6)) - 10), peak)
      textcolor.header = header
      if (height > 80) {
        peak = height < 30 ? height : 30
        footer = scan(Math.floor(width * (1/7)), height-peak-1, (Math.floor(width * (6/7)) - 5), peak)
      }
      textcolor.footer = footer
      let halt = false
      if (header.primaryColor === null && header.noRatio > .77 && (footer === null || footer && footer.noRatio > .61)) {
        halt = true
      }
      return halt
    }

    let halt = evaltextcolor()

    if (halt) {
      details.exit = true
      return {
        istwitter: false,
        primarycolor: null,
        proceed: false,
        foundonpass: null,
        details
      }
    }
    
    function evalheaderweight() {
      details.lastEvaluation = "header"
      details.evaluations.header = {}
      let header = details.evaluations.header
      header.headerHeight = headerHeight
      header.headerWidthDivisor = headerWidthDivisor
      let response = {
        infound: false,
        predom: null
      }
      let rightpredomvalue
      let rightsumvalue
      let leftpredomvalue
      let leftsumvalue
      let rightpredomtosumratio
      let leftpredomtosumratio
      let rightnonsumratio
      let leftnonsumratio
      let diffratiosyes
      let diffratiosno
      let predomratio
      let nonratio
      function bgcolortest(r,g,b) {
        let colsum = r + g + b
        let desaturated = 
          Math.abs(r - g) < 16 && 
          Math.abs(g - b) < 16 && 
          Math.abs(r - b) < 16
        if ( colsum > 680 && desaturated ) {
          return "white"
        }
        else if (
             r > 0  && r < 70
          && g > 10 && g < 80
          && b > 20 && b < 90
          && g > r ) {
          return "blue"
        }
        else if ( colsum < 100 && desaturated )  {
          return "black"
        }
        else {
          return null
        }
      }  
      function bgcolorpick(x,y) {
        const color = ctx.getImageData(x,y,1,1).data
        const r = color[0]
        const g = color[1]
        const b = color[2]
        return bgcolortest(r,g,b)
      }          
      let peak = height < headerHeight ? height : headerHeight
      let whitecount = 0
      let allcount = 0
      let bluecount = 0
      let blackcount = 0
      let nocount = 0
      let baseline = null
      let sixth = Math.floor(width/headerWidthDivisor)
      for (let y=0;y<peak;y++) {
        for (let x=sixth;x<width;x++) {
          if (x === sixth) {
            draw(x,y,"red")
          }
          if (y === peak - 1) {
            draw(x,y,"blue")
          }
          let test = bgcolorpick(x,y)
          if (test === "white") {
            whitecount++
          }
          else if (test === "blue") {
            bluecount++
          }
          else if (test === "black") {
            blackcount++
          }
          else {
            nocount++
          }
          allcount++
        }
      }
      let wcr = (whitecount/allcount)
      let bcr = (blackcount/allcount)
      let blr = (bluecount/allcount)
      let ncr = (nocount/allcount)
      let predom = null
      if (whitecount > nocount && whitecount > blackcount && whitecount > bluecount) {
        predom = "white"
        rightpredomvalue = whitecount
        rightpredomtosumratio = wcr
      }
      else if (blackcount > nocount && blackcount > whitecount && blackcount > bluecount) {
        predom = "black"
        rightpredomvalue = blackcount
        rightpredomtosumratio = bcr
      }
      else if (bluecount >= nocount && bluecount >= whitecount && bluecount >= blackcount) {
        predom = "blue"
        rightpredomvalue = bluecount
        rightpredomtosumratio = blr
      }
      else {
        predom = "nothing"
        rightpredomvalue = nocount
        rightpredomtosumratio = ncr
      }
      rightnonsumratio = ncr
      rightsumvalue = allcount
      header.rightNonToSumRatio = ncr
      header.rightPredominantToSumRatio = rightpredomtosumratio
      header.rightPredominantColor = predom
      if (predom === "nothing") {
        return response    
      }
      else {
        whitecount = 0
        allcount = 0
        bluecount = 0
        blackcount = 0
        nocount = 0
        baseline = null
        sixth = Math.floor(width/headerWidthDivisor)
        for (let y=0;y<peak;y++) {
          for (let x=0;x<sixth;x++) {
            if (y === peak - 1) {
              draw(x,y,"cyan")
            }
            let test = bgcolorpick(x,y)
            if (test === "white") {
              whitecount++
            }
            else if (test === "blue") {
              bluecount++
            }
            else if (test === "black") {
              blackcount++
            }
            else {
              nocount++
            }
            allcount++
          }
        }
        wcr = (whitecount/allcount)
        bcr = (blackcount/allcount)
        blr = (bluecount/allcount)
        ncr = (nocount/allcount)
        if (predom === "white") {
          leftpredomvalue = whitecount
          leftpredomtosumratio = wcr
        }
        else if (predom === "black") {
          leftpredomvalue = blackcount
          leftpredomtosumratio = bcr
        }
        else if (predom === "blue") {
          leftpredomvalue = bluecount
          leftpredomtosumratio = blr
        }
        leftnonsumratio = ncr
        leftsumvalue = allcount
        header.leftNonToSumRatio = ncr
        header.leftPredominantToSumRatio = leftpredomtosumratio
        header.leftPredominantColor = predom
        predomratio = (rightpredomtosumratio - leftpredomtosumratio)
        nonratio =  (leftnonsumratio - rightnonsumratio)
        header.deltaPredominant = predomratio
        header.deltaNon = nonratio
        let lastx = 0
        function verticalline() {
          let found = true
          let xcount = 0
          let tenth = Math.floor(width/10)
          for (let x=tenth;x<tenth*2;x++) {
            lastx = x
            xcount++
            found = true
            for (let y=4;y<20;y++) {
              draw(x,y,"lime")
              let test = bgcolorpick(x,y)
              if (test !== predom) {
                found = false
                break
              }
            }
            if (found && xcount > 4) {
              break
            }
          }
          return found
        }
        let horizfoundy = null
        function horizontalline() {
          let found = true
          let tenth = Math.floor(width/10)
          let peak = height < 36 ? height : 36
          for (let y=7;y<peak;y++) {
            found = true
            for (let x=lastx+15;x<width-tenth+15;x+=2) {
              draw(x,y,"magenta")
              horizfoundy = y
              let test = bgcolorpick(x,y)
              if (test !== predom) {
                found = false
                break
              }                             
            }
            if (found) {
              break
            }
          }
          return found
        }
        let vertical = verticalline()
        header.verticalLineRightTest = vertical
        let horizontal = horizontalline()
        header.horizontalLineRightTest = horizontal
        let lefthorizontal = false
        header.horizontalLineLeftTest = lefthorizontal
        let found = true
        if (horizfoundy !== null) {
          let peak = horizfoundy + 56 > height ? height : horizfoundy + 56
          for (let y = horizfoundy; y<= peak; y++) {
            found = true
            let off = lastx + 15 > width ? width-1 : lastx + 15
            draw(off,y,"purple")
            for (let x = off; x >= 6; x--) {
              let test = bgcolorpick(x,y)
              if (test !== predom) {
                draw(6,y,"red")
                found = false
                break
              } 
            }
            if (found) {
              draw(lastx,y,"lime")
              draw(1,y,"lime")
              break
            }
          }
        }
        if (found) {
          lefthorizontal = true
          header.horizontalLineLeftTest = lefthorizontal
        }
        let leftvertical = true
        let leftverticalx = 0
        let clear = true
        for (let i=0;i<5;i++) {
          leftverticalx = i
          clear = true
          let osx = height - 10
          let points = 5
          for (let t=peak+1;t<osx;t+=2) {
            let test = bgcolorpick(i,t)
            if (test !== predom) {
              points--
              if (points <= 0) {
                clear = false
                break
              }
            }    
          }
          if (clear) {
            break
          }
        }
        if (!clear) {
          leftvertical = false                 
        }
        header.verticalLineLeftTest = leftvertical
        header.verticalLineLeftTestX = leftverticalx
        if ((predomratio <= 0.79  
          && (((predomratio >= 0.198 
          && nonratio >= 0.17)
          || (predomratio > .5 
          && nonratio > .06)) 
          && rightpredomtosumratio > .77 
          && rightnonsumratio < .22) 
          || (predomratio > .61 
          && nonratio > .2 
          && rightpredomtosumratio > .71 
          && rightnonsumratio < .25))
          && horizontal && leftvertical && lefthorizontal) {
          response.infound = true
        }
        response.predom = predom
        return response    
      }
    }

    let {predom, infound} = evalheaderweight()

    if (infound) {
      return {
        istwitter: true,
        primarycolor: predom,
        proceed: false,
        foundonpass: null,
        details,
        invert: false
      }  
    }
    
    function evalcheckmark() {
      details.lastEvaluation = "checkmark"
      details.evaluations.checkmark = {}
      let checkmark = details.evaluations.checkmark
      let fourth = Math.floor(width/4)
      let fifth = Math.floor(width/5)
      function surpass(x,y) {
        const color = ctx.getImageData(x,y,1,1).data
        let r = color[0]
        let g = color[1]
        let b = color[2]
        let colsum = r + g + b
        let desat = 15
        let desaturated = 
          Math.abs(r - g) < desat && 
          Math.abs(g - b) < desat && 
          Math.abs(r - b) < desat
          if ( b > 160  &&  b <= 255
            && g > 120  &&  g <= 255
            && r > 20   &&  r <= 200
            && g > r
            && b > r
            && b > g
            && g > r + 50 ) {
            return "twitterblue"
          }
          else if (colsum > 600 && desaturated) {
            return "white"
          }
          else if (desaturated) {
            return "offwhite"
          }
          else {
            draw(x,y,"red")
            return null
          }
      }
      let bf = null
      let bb = null
      let be = null
      let whitecount = 0
      let offwhitecount = 0
      let twitterbluecount = 0
      let blankcount = 0
      let allcount = 0
      let tbtly = false
      let tbtlx = false
      let tbbry = false
      let tbbrx = false
      let peak = height < 36 ? height : 36
      
      checkmark.left = fifth
      checkmark.right = width-10
      checkmark.top = 1
      checkmark.bottom = peak  
      
      for (let y=1;y<peak;y++) {
        for (let x=width-10;x>=fifth;x--) {
          allcount++
          let pxtest = surpass(x,y)
          if (pxtest === "white") {
            whitecount++
          }
          else if (pxtest === "offwhite") {
            offwhitecount++
          }
          else if (pxtest === "twitterblue") {
            if (tbtly === false) {
              tbtly = y
            }
            if (tbtlx === false || tbtlx > x) {
              tbtlx = x
            }
            if (tbbry === false || tbbry < y) {
              tbbry = y
            }
            if (tbbrx === false || tbbrx < x) {
              tbbrx = x
            }
            twitterbluecount++
          }
          else {
            blankcount++
          }
        } 
      }
      checkmark.twitterblueCount = twitterbluecount
      if (twitterbluecount > 4) {
        tbtly = tbtly - 1
        tbbry = tbbry - 1
        tbtlx = tbtlx - fifth
        tbbrx = tbbrx - fifth
        let tbDy = (1 + tbbry - tbtly)
        let tbDx = (1 + tbbrx - tbtlx)
        let lar = tbDy >= tbDx ? tbDy : tbDx
        let sml = tbDy <= tbDx ? tbDy : tbDx
        checkmark.largerSide = lar
        checkmark.smallerSide = sml
        let tbbound = tbDy * tbDx
        checkmark.tbDy = tbDy
        checkmark.tbDx = tbDx
        checkmark.tbtly = tbtly
        checkmark.tbbry = tbbry
        checkmark.tbtlx = tbtlx
        checkmark.tbbrx = tbbrx
        let tbratio = twitterbluecount/tbbound
        let wcratio = whitecount/allcount
        let owcratio = offwhitecount/allcount
        let bcratio = blankcount/allcount
        checkmark.twitterblueBound = tbbound
        checkmark.twitterblueRatio = tbratio
        checkmark.whiteRatio = wcratio
        checkmark.offwhiteRatio = owcratio
        checkmark.blankcountRatio = bcratio
        checkmark.nonRatio = bcratio
        if ( tbratio > .52 
          && wcratio > .63 
          && owcratio > .008 
          && bcratio > .001 
          && bcratio < .1 
          && lar/sml < 2.3
        ) {
          return true
        }
      }
      return false
    }

    if (predom === "white") {
      infound = evalcheckmark()
      if (infound) {
        return {
          istwitter: true,
          primarycolor: predom,
          proceed: false,
          foundonpass: null,
          details,
          invert: false
        }  
      }
    }

    function evaltwitterblue() {
      details.lastEvaluation = "twitterblue"
      details.evaluations.twitterblue = {}
      let twitterblue = details.evaluations.twitterblue
      let istwitterblue = 0
      let totalsum = 0
      let peak = height < 32 ? height : 32
      let imagedata = ctx.getImageData(
        Math.floor(width * (1/6)), 4, (Math.floor(width * (5/6)) - 10), peak
      )
      data = imagedata.data
      for (let i=0;i<data.length;i+=4) {
        totalsum++
        let r = data[i+0]
        let g = data[i+1]
        let b = data[i+2]
        if ( r > 17 && r < 28
          && g > 26 && g < 35
          && b > 36 && g < 48 ) {
          istwitterblue++
        }
      }
      let twitterblueratio = istwitterblue/totalsum
      twitterblue.quarterTotalSum = totalsum
      twitterblue.quarterTwitterblueSum = istwitterblue
      twitterblue.quarterTwitterblueRatio = twitterblueratio
      if (twitterblueratio >= .61) {
        return true
      }
      let verytwitterblue = 0
      totalsum = 0
      imagedata = ctx.getImageData(
        0,0,width,height
      )
      data = imagedata.data
      for (let i=0;i<data.length;i+=4) {
        totalsum++
        let r = data[i+0]
        let g = data[i+1]
        let b = data[i+2]
        if ( r === 22 && g === 32 && b === 41 ) {
          verytwitterblue++
        }
      }
      let verytwitterblueratio = verytwitterblue/totalsum
      twitterblue.fullTotalSum = totalsum
      twitterblue.fullVeryTwitterblueSum = verytwitterblue
      twitterblue.fullVeryTwitterblueRatio = verytwitterblueratio
      if (verytwitterblueratio > .11) {
        return true
      }
      return false
    }
    
    if (predom === "blue") {
      infound = evaltwitterblue()
      if (infound) {
        return {
          istwitter: true,
          primarycolor: predom,
          proceed: false,
          foundonpass: null,
          details
        }
      }
    }

    function evalinvert() {
      details.lastEvaluation = "invert"
      details.evaluations.invert = {}
      let invert = details.evaluations.invert
      let blacksum = 0
      let whitesum = 0
      let totalsum = 0
      let peak = height < 32 ? height : 32
      let imagedata = ctx.getImageData(
        Math.floor(width * (1/6)), 4, (Math.floor(width * (5/6)) - 10), peak
      )
      let data = imagedata.data
      for (let i=0;i<data.length;i+=4) {
        totalsum++
        let r = data[i+0]
        let g = data[i+1]
        let b = data[i+2]
        let desaturated = 
          Math.abs(r - g) < 16 && 
          Math.abs(g - b) < 16 && 
          Math.abs(r - b) < 16      
        let sum = r + g + b
        if (sum > 680 && desaturated) {
          whitesum++
        }
        else if (
             r > 0  && r < 70
          && g > 10 && g < 80
          && b > 20 && b < 90
          && g > r ) {
          blacksum++
        }
        else if (sum < 100 && desaturated) {
          blacksum++
        }      
      }
      let inversion = whitesum > blacksum ? false : true
      invert.whitesum = whitesum
      invert.blacksum = blacksum
      invert.inversion = inversion
      return inversion
    }

    const invert = evalinvert()

    const evalpfp = function(gcanvas, contrast) {
      details.lastEvaluation = "pfp"
      details.evaluations.pfp = {}
      let dpfp = details.evaluations.pfp
      dpfp.contrast = contrast
      dpfp.fail = null
      dpfp.success = false
      function bgcolortest(r,g,b) {
        let colsum = r + g + b
        let desat = 40
        let desaturated = 
          Math.abs(r - g) < desat && 
          Math.abs(g - b) < desat && 
          Math.abs(r - b) < desat
        if ( colsum > 710 && desaturated ) {
          return "white"
        }
        else if (
             r > 0  && r < 50
          && g > 10 && g < 60
          && b > 20 && b < 70
          && g > r ) {
          return "blue"
        }
        else if ( colsum < 70 && desaturated )  {
          return "black"
        }
        else {
          return null
        }
      }
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const width = gcanvas.width
      const height = gcanvas.height
      canvas.width = width
      canvas.height = height
      ctx.filter = `contrast(${contrast}%)`
      ctx.drawImage(gcanvas,0,0)
      function pxtest(x,y) {
        const color = ctx.getImageData(x,y,1,1).data
        return bgcolortest(color[0],color[1],color[2])  
      }
      let primarycolor = null
      for (let i=0;i<2;i++) {
        let test = pxtest(i,i)
        if (test !== null) {
          primarycolor = test
          break
        }
      }
      if (!primarycolor) {
        for (let i=0;i<2;i++) {
          let test = pxtest(i,i)
          if (test !== null) {
            primarycolor = test
            break
          }
        }  
      }
      let err = null
      if (!primarycolor) {
        dpfp.fail = "did not pass top left color test"
        return false
      }
      let fourth = Math.floor(width/4)
      let fifth = Math.floor(width/5)
      let blankclearing = true
      let blankcleared = false
      let circleclearing = false
      let circlecleared = false
      let fail = false
      let decdown = true
      let notch = false
      let watermark = 0
      let leftedge = 0
      let ytop = 0
      let xtop = 0
      let ybottom = 0
      let xbound = 0
      let ybound = 0
      let tlx = false
      let tly = false
      let lastx = false
      let lasty = false
      let firstjumptakeoffarray = false
      let firstjump = 0
      let lastdecupx = false
      let reachedascending = false
      let points = 6
      for (let y=0;y<fourth;y+=2) {
        let circlespotfound = false
        for (let x=0;x<fourth;x+=2) {
          draw(x,y,"yellow")
          let test = pxtest(x,y)
          if (blankclearing) {
            if (test !== primarycolor) {
              if (blankcleared) {
                points = 2
                firstjumptakeoffarray = true
                watermark = x
                ytop = y
                xtop = x
                blankclearing = false
                notch = true
                break
              }
              points--
              if (points <= 0) {
                err = "fail from never having first cleared top row"
                fail = true
                break
              }
            }
          }
          else if (circleclearing) {
            if (test !== primarycolor) {
              circlespotfound = true
              if (decdown) {
                draw(x,y,"red")
                if (firstjumptakeoffarray) {
                  firstjump = watermark - x
                  firstjumptakeoffarray = false
                }
                if (watermark < x) {
                  decdown = false
                  leftedge = watermark
                  xbound = ((xtop - leftedge) * 2) + leftedge
                }
                watermark = x
              }
              else {
                draw(x,y,"blue")
                reachedascending = true
                lastdecupx = x
                ybottom = y
                if (watermark > x) {
                  points--
                  if (points <= 0) {
                    err = "fail from watermark suddenly ascending on descent"
                    fail = true
                    break
                  }
                }
                if (watermark <= x) {
                  watermark = x
                }
              }
              break
            }
            else if (lastdecupx && x > lastdecupx + firstjump) {
              xbound = x
              ybound = y
              break
            }
          }
        }
        if (fail) {
          break
        }
        if (blankclearing && !blankcleared) {
          blankcleared = true
        }
        else if (!blankclearing && circleclearing && !circlespotfound) {
          let proceed = false
          let color = pxtest(xbound,ybound)
          if (!color) {
            err = `wrong color at ${xbound}x${ybound}`
            break
          }
          lastx = xbound
          let everreachedclean = false
          let everreachedspot = false
          for (let q=xbound;q<xbound+30;q++) {
            if (fail) {
              break
            }
            lastx = q
            let clean = true
            for (let z=ybound;z>=0;z--) {
              draw(q,z,"lime")
              let spotcolor = pxtest(q,z)
              if (spotcolor !== color) {
                if (z < ytop) {
                  clean = false
                  fail = true
                  err = "scanright surpassed ytop"
                  break
                }
                everreachedspot = true
                clean = false
                break
              }
            }
            if (clean) {
              everreachedclean = true
              break
            }
          }
          lasty = 0
          if (everreachedclean && everreachedspot) {
            lastx = lastx - 1
            everreachedspot = false
            for (let z=ybound;z>=0;z--) {
              let clean = true
              for (let q=xbound;q>=0;q--) {
                //
                let spotcolor = pxtest(q,z)
                if (spotcolor !== color) {
                  draw(q,z,"magenta")
                  lasty = z
                  clean = false
                  break
                }
              }
              if (!clean) {
                everreachedspot = true
                break
              }
            }
            if (everreachedclean && everreachedspot) {
              proceed = true
            }
            else {
              break
            }
          }
          else {
            break
          }
          if (proceed) {
            let color = pxtest(leftedge,ytop)
            if (!color) {
              break
            }
            for (let z=ytop;z>=0;z--) {
              let clean = true
              for (let q=leftedge;q<lastx;q++) {
                let spotcolor = pxtest(q,z)
                if (spotcolor !== color) {
                  clean = false
                  tly = z
                  break
                }
              }
              if (clean) {
                break
              }
            }
            if (tly !== false) {
              for (let q=leftedge;q>=0;q--) {
                let clean = true
                for (let z=ytop;z<lasty;z++) {
                  let spotcolor = pxtest(q,z)
                  if (spotcolor !== color) {
                    clean = false
                    tlx = q
                    break
                  }              
                }
                if (clean) {
                  break
                }
              }
            }
            else {
              break
            }
          }
          break
        }
        if (notch) {
          notch = false
          circleclearing = true
        }
      }
      if (tlx===false || tly===false || lastx===false || lasty===false) {
        dpfp.fail = err || "no circle"
        return false
      }
      draw(tlx,tly,"cyan")
      draw(tlx,lasty,"cyan")
      draw(lastx,tly,"cyan")
      draw(lastx,lasty,"cyan")
      let square = Math.abs((lastx - tlx) - (lasty - tly))
      dpfp.square = square
      if (square > 6) {
        dpfp.fail = "not a square"
        return false   
      }    
      tlx = tlx +1
      tly = tly +1
      lastx = lastx -1
      lasty = lasty -1
      let cola = pxtest(tlx,tly)
      let colb = pxtest(tlx,lasty)
      let colc = pxtest(lastx,tly)
      let cold = pxtest(lastx,lasty)
      if ( cola != colb 
        || colb != colc 
        || colc != cold 
        || cold !== cola 
        || cola === null ) {
        dpfp.fail = `corner test fail: ${cola} ${colb} ${colc} ${cold}`
        return false   
      }
      let midx = Math.round((lastx - tlx) / 2) + tlx
      fail = false
      dpfp.y2 = lasty
      dpfp.y1 = tly
      dpfp.x2 = lastx
      dpfp.x1 = tlx
      for (let y=lasty+3;y<lasty+7;y++) {
        for (let x=tlx;x<lastx+1;x++) {
          if (x === midx -1 || x === midx || x === midx + 1) {
            draw(x,y,"red")
            continue
          }
          draw(x,y,"yellow")
          let test = pxtest(x,y)
          if (test !== cola) {
            draw(x,y,"purple")
            fail = true
            break
          }
        }
        if (fail) {
          break
        }
      }
      if (fail) {
        dpfp.fail = `area under pfp was not bg color`
        return false           
      }
      let midy = Math.round((lasty - tly) / 2) + tly
      let noncolorspotcounta = 0
      let noncolorspotcountb = 0
      for (let u=0;u<8;u++) {
        let zab = (360/8) * u
        let zas = Math.cos(zab * Math.PI/180) * ((lastx-tlx)/6)
        let zac = Math.sin(zab * Math.PI/180) * ((lastx-tlx)/6)
        let nbe = Math.round(midx + zas)
        let nbf = Math.round(midy + zac)
        let spotcolor = pxtest(nbe,nbf)
        if (spotcolor !== cola) {
          noncolorspotcounta++
        }
      }
      for (let u=0;u<8;u++) {
        let zab = (360/8) * u
        let zas = Math.cos(zab * Math.PI/180) * ((lastx-tlx)/2.25)
        let zac = Math.sin(zab * Math.PI/180) * ((lastx-tlx)/2.25)
        let nbe = Math.round(midx + zas)
        let nbf = Math.round(midy + zac)
        let spotcolor = pxtest(nbe,nbf)
        if (spotcolor !== cola) {
          noncolorspotcountb++
        }
      }
      if (noncolorspotcounta <= 6 && noncolorspotcountb <= 6) {
        dpfp.fail = `matched, but inside pfp is same as outside color`
        return false           
      }
      let reduce = width - lastx - Math.floor(fourth/8) - 5
      let clear = false
      points = 1
      for (let t=tly+1;t<lasty;t++) {
        clear = true
        for (let f=lastx+4;f<reduce+lastx+3;f+=2) {
          let test = pxtest(f,t)
          draw(f,t,"red")
          if (test !== primarycolor) {
            draw(f,t,"yellow")
            points--
            if (points <= 0) {
              clear = false
              break
            }
          }
        }
        if (clear === true) {
          break
        }
      }
      if (!clear) {
        dpfp.fail = `right horizontal test fail`
        return false              
      }
      clear = true
      let osx = height - 3
      
      if (height > width * 1.55) {
        osx = Math.floor(width * 1.55)
      }
      let breakpoint = null
      points = 3
      for (let t=lasty+1;t<osx;t+=2) {
        let test = pxtest(0,t)
        draw(1,t,"red")
        if (test !== primarycolor) {
          points--
          if (points <= 0) {
            clear = false
            break
          }
          let seeka = t+2
          let seekb = t+4
          if (seeka > height-1 || seekb > height-1) {
            clear = false
            break
          }
          let seektesta = pxtest(0,t+2)
          let seektestb = pxtest(0,t+4)
          if (seektesta === primarycolor && seektestb === primarycolor) {
            t+=6
            continue
          }
          breakpoint = t
          draw(0,t,"yellow")
          clear = false
          break
        }    
      }
      if (!clear && breakpoint !== null) {
        clear = true
        points = 3
        dpfp.ninetyDegreesTurn = false
        for (let x=0;x<50;x+=2) {
          let testa = pxtest(x,breakpoint-2)
          let testb = pxtest(x,breakpoint+2)
          draw(x,breakpoint-2,"magenta")
          draw(x,breakpoint+2,"lime")
          if (testa !== primarycolor || testb === primarycolor) {
            points--
            if (points <= 0) {
              draw(x,breakpoint,"lime")
              clear = false
            }
          }
        }
        dpfp.ninetyDegreesTurn = true
      }
      if (!clear) {
        dpfp.fail = `left vertical test fail`
        return false                   
      }
      clear = true
      let h2 = Math.floor(height/3)
      let w2 = Math.floor(width/2)
      for (let t=h2,j=0;t<height;t+=1,j+=1) {
        let test = pxtest(w2+j,t)
        if (test !== primarycolor) {
          clear = false
          break
        }      
      }
      if (clear) {
        dpfp.fail = `no inner text/image`
        return false   
      }
      dpfp.fail = false
      dpfp.success = `success at ${contrast} contrast`
      return true 
    }
    let pfp = false
    if (predom !== null) {
      for (let q=0;q<3;q++) {
        let contrast = 100 + (q*25)
        let test = evalpfp(canvas, contrast)
        if (test) {
          pfp = true
          break
        }
      }
    }
    if (pfp) {
      return {
        istwitter: true,
        primarycolor: null,
        proceed: false,
        foundonpass: 0,
        details
      }      
    }
    function evalskiphorizontal() {
      details.lastEvaluation = "skiphorizontal"
      let clonecanvas = document.createElement("canvas")
      let clonectx = clonecanvas.getContext('2d')
      clonecanvas.width = canvas.width
      clonecanvas.height = canvas.height
      clonectx.filter = "contrast(130%)"
      clonectx.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,clonecanvas.width,clonecanvas.height)
      function bgcolortest(r,g,b) {
        let colsum = r + g + b
        let desaturated = 
          Math.abs(r - g) < 16 && 
          Math.abs(g - b) < 16 && 
          Math.abs(r - b) < 16
        if ( colsum > 660 && desaturated ) {
          return "white"
        }
        else if (
             r > 0  && r < 40
          && g > 10 && g < 50
          && b > 20 && b < 60
          && g > r ) {
          return "black"
        }
        else if ( colsum < 150 && desaturated )  {
          return "black"
        }
        else {
          return null
        }
      }  
      function bgcolorpick(x,y) {
        const color = clonectx.getImageData(x,y,1,1).data
        const r = color[0]
        const g = color[1]
        const b = color[2]
        return bgcolortest(r,g,b)
      } 
      let atleastonepass = false
      let ypass = 0
      let found
      let colors = ["white", "black"]
      for (let i=0;i<2;i++) {
        found = colors[i]
        let color = colors[i]
        for (let y=2;y<clonecanvas.height-2;y++) {
          let clear = true
          ypass = y
          for (let x=6;x<clonecanvas.width-16;x++) {
            let test = bgcolorpick(x,y)
            if (test !== color) {
              clear = false
              break
            }
          }
          if (clear) {
            atleastonepass = true
            break
          }
        }
        if (atleastonepass) {
          break
        }
      }
      details.evaluations.skiphorizontal = {}
      details.evaluations.skiphorizontal.status = atleastonepass
      details.evaluations.skiphorizontal.foundY = ypass
      details.evaluations.skiphorizontal.foundColor = found
      return atleastonepass
    }
    
    let horizontal = evalskiphorizontal()
    
    if (!horizontal) {
      details.exit = true
      return {
        istwitter: false,
        primarycolor: null,
        proceed: false,
        foundonpass: null,
        details
      }
    }
    
    function evaledges() {
      let proceed = false
      let primarycolor = null
      let foundonpass = 0

      function bgcolortest(r,g,b) {
        let colsum = r + g + b
        let desaturated = 
          Math.abs(r - g) < 16 && 
          Math.abs(g - b) < 16 && 
          Math.abs(r - b) < 16
        if ( colsum > 680 && desaturated ) {
          return "white"
        }
        else if (
             r > 0  && r < 70
          && g > 10 && g < 80
          && b > 20 && b < 90
          && g > r ) {
          return "black" // special in this instance
        }
        else if ( colsum < 100 && desaturated )  {
          return "black"
        }
        else if ((colsum > 148 || colsum < 152) && desaturated) {
          return "black"
        }
        else {
          return null
        }
      }  

      function bgcolorpick(x,y) {
        const color = ctx.getImageData(x,y,1,1).data
        const r = color[0]
        const g = color[1]
        const b = color[2]
        return bgcolortest(r,g,b)
      }

      const passes = {}
      passes[0] = function() {
        let topleftcolor = null
        for (let i=0;i<9;i++) {
          let result = bgcolorpick(i,i)
          if (result !== null) {
            topleftcolor = result
            break
          }
        }
        if (!topleftcolor) {
          return null
        }
        let secondcolormatch = false
        let x = Math.floor((width/4) * 3)
        for (let i=0;i<12;i++) {
          let result = bgcolorpick(x,i)
          if (result === topleftcolor) {
            secondcolormatch = true
            break
          }
        }
        if (secondcolormatch) {
          primarycolor = topleftcolor
          proceed = true
          return null
        }
        let y = Math.floor(height/3)
        for (let i=0;i<12;i++) {
          let result = bgcolorpick(i,y)
          if (result === topleftcolor) {
            secondcolormatch = true
            break
          }
        }
        if (secondcolormatch) {
          primarycolor = topleftcolor
          proceed = true
          return null
        }
        for (let i=0;i<9;i++) {
          let result = bgcolorpick(width-1-i,i)
          if (result === topleftcolor) {
            secondcolormatch = true
            break
          }
        }
        if (secondcolormatch) {
          primarycolor = topleftcolor
          proceed = true
        }
        return null
      }
      passes[1] = function() {
        let t34 = null
        let l13 = null
        let l23 = null
        // top 3/4 right
        let x = Math.floor((width/4) * 3)
        for (let i=0;i<12;i++) {
          let result = bgcolorpick(x,i)
          if (result !== null) {
            t34 = result
            break
          }
        }
        let y = Math.floor(height/3)
        for (let i=0;i<12;i++) {
          let result = bgcolorpick(i,y)
          if (result !== null) {
            l13 = result
            break
          }
        }
        y = Math.floor((height/3) * 2)
        for (let i=0;i<12;i++) {
          let result = bgcolorpick(i,y)
          if (result !== null) {
            l23 = result
            break
          }
        }
        if (t34 !== null && t34 === l13) {
          primarycolor = t34
          proceed = true
        }
        else if (t34 !== null && t34 === l23) {
          primarycolor = t34
          proceed = true
        }
        else if (l23 !== null && l23 === l13) {
          primarycolor = l23
          proceed = true
        }
        return null
      }
      passes[2] = function() {
        let bottomleftcolor = null
        for (let i=0;i<6;i++) {
          let result = bgcolorpick(i,height-1-i)
          if (result !== null) {
            bottomleftcolor = result
            break
          }
        }
        if (!bottomleftcolor) {
          return null
        }
        let secondcolormatch = false
        for (let i=0;i<6;i++) {
          let result = bgcolorpick(width-1-i,height-1-i)
          if (result === bottomleftcolor) {
            secondcolormatch = true
            break
          }
        }
        if (secondcolormatch) {
          primarycolor = bottomleftcolor
          proceed = true
          return null
        }    
        return null
      }
      passes[3] = function() {
        let fc = null
        let found = true
        let slice = Math.floor(width/16)
        let x = (slice * 14) + Math.floor(slice/2)
        for (let i=x;i<x+6;i++) {
          let result = bgcolorpick(i,2)
          if (i === x) {
            if (result === null) {
              found = false
              break
            }
            fc = result
          }
          else {
            if (result !== fc) {
              found = false
              break
            }
          }
        }
        if (found) {
          primarycolor = fc
          proceed = true
          return null      
        }
      }
      passes[4] = function() {
        let nump = 0
        let adjunct = Math.floor(height/6)
        let mid = Math.floor(width/2)
        let hex = Math.floor(width/6)
        let spotcount = 0
        let spotcolor = null
        let found = false
        for (let i=0;i<adjunct;i++) {
          if (nump > 4) {
            break
          }
          let result = bgcolorpick(mid,i)
          if (result === null) {
            spotcolor = null
            spotcount = 0
            continue
          }
          if (spotcolor === null) {
            spotcolor = result
          }
          if (spotcolor !== result) {
            spotcolor = null
            spotcount = 0
            continue
          }
          spotcount++
          if (spotcount === 2) {
            spotcount = 0
            let pass = true
            for (let j=0;j<hex;j++) {
              let result = bgcolorpick(mid + j,i)
              if (result !== spotcolor) {
                nump++
                pass = false
                break
              }
            }
            if (pass) {
              found = true
              break
            }
          }
        }
        if (found) {
          primarycolor = spotcolor
          proceed = true
          return null   
        }
      }
      for (let i=0;i<5;i++) {
        foundonpass = i
        passes[i]()
        if (proceed) {
          break
        }
      }
      return {proceed, foundonpass, primarycolor}
    }

    let {proceed, foundonpass, primarycolor} = evaledges()
    details.lastEvaluation = "edges"
    details.evaluations.edges = {}
    let edges = details.evaluations.edges
    edges.foundOnPass = foundonpass
    edges.proceed = proceed
    edges.primaryColor = primarycolor
    
    return {
      istwitter: false,
      primarycolor,
      proceed,
      foundonpass,
      details,
      invert
    }
    
  }

  const evalfullsize = function(args) {
    let {id, fullsizeurl, details, invert} = args
    const imgloaded = function(image) {
      let width = image.width
      let height = image.height
      let destwidth = width
      let destheight = height
      let canvas = document.createElement("canvas")
      if (width !== 1000) {
        destheight = Math.floor((1000/width) * height)
        destwidth = 1000      
      }
      if (destheight > 2400) {
        details.abort = "image too tall"
        response(id, false, details)
        setTimeout(()=>{
          workerqueue.resume()
        },0)
        return null
      }
      canvas.width = destwidth
      canvas.height = destheight
      let lctx = canvas.getContext("2d")
      lctx.drawImage(image, 
        0, 0, width, height, 
        0, 0, destwidth, destheight
      )
      const fxcanvas = document.createElement("canvas")
      const fxctx = fxcanvas.getContext("2d")
      let fxwidth
      let fxheight
      fxwidth = Math.floor((destwidth * 2/3) * 2)
      fxheight = Math.floor(((destheight * 1/3) * 2) + ((destheight * 1/5) * 4))
      fxctx.fillStyle="#fff"
      fxctx.fillRect(0,0,fxwidth,fxheight)
      fxcanvas.width = fxwidth
      fxcanvas.height = fxheight
      fxctx.save()
      if (invert) {
        fxctx.filter = `saturate(0) invert(1) brightness(${52+12}%) contrast(150%) contrast(150%) contrast(150%)`
        fxctx.drawImage(canvas, 0, 0)
        fxctx.filter = `saturate(0) invert(1) brightness(${52+16}%) contrast(150%) contrast(150%) contrast(150%)`
        fxctx.drawImage(canvas, Math.floor(destwidth * 2/3),  0)
        fxctx.filter = `saturate(0) invert(1) brightness(${52+19}%) contrast(150%) contrast(150%) contrast(150%)`
        fxctx.drawImage(canvas, 0, Math.floor(destheight * 1/3))
        fxctx.filter = `saturate(0) invert(1) brightness(${52+24}%) contrast(150%) contrast(150%) contrast(150%)`
        fxctx.drawImage(canvas, Math.floor(destwidth * 2/3), Math.floor(destheight * 1/3))
      }
      else {
        fxctx.filter = `saturate(0) brightness(${52+12}%) contrast(150%) contrast(150%)`
        fxctx.drawImage(canvas, 0, 0)
        fxctx.filter = `saturate(0) brightness(${52+15}%) contrast(150%) contrast(150%)`
        fxctx.drawImage(canvas, Math.floor(destwidth * 2/3),  0)
        fxctx.filter = `saturate(0) brightness(${52+18}%) contrast(150%) contrast(150%)`
        fxctx.drawImage(canvas, 0, Math.floor(destheight * 1/3))
        fxctx.filter = `saturate(0) brightness(${52+24}%) contrast(150%) contrast(150%)`
        fxctx.drawImage(canvas, Math.floor(destwidth * 2/3), Math.floor(destheight * 1/3))
      }
      fxctx.restore()
      fxctx.fillStyle="#fff"
      fxctx.fillRect(0,Math.floor((destheight * 1/3) * 2),fxwidth,fxheight)
      fxctx.save()
      if (invert) {
        fxctx.filter = `saturate(0) invert(1) brightness(${52+11}%) contrast(150%) contrast(150%) contrast(150%)`
        fxctx.drawImage(
          canvas, 
          0, Math.floor((destheight * 1/5) * 4), destwidth, destheight, 
          0, (Math.floor(destheight * 1/3) * 2) , destwidth, destheight
        )
        fxctx.filter = `saturate(0) invert(1) brightness(${52+16}%) contrast(150%) contrast(150%) contrast(150%)`
        fxctx.drawImage(
          canvas, 
          0, Math.floor((destheight * 1/5) * 4), destwidth, destheight, 
          0, (Math.floor(destheight * 1/3) * 2)  + (Math.floor(destheight * 1/5) * 1), destwidth, destheight
        )
        fxctx.filter = `saturate(0) invert(1) brightness(${52+19}%) contrast(150%) contrast(150%) contrast(150%)`
        fxctx.drawImage(
          canvas, 
          0, Math.floor((destheight * 1/5) * 4), destwidth, destheight, 
          0, (Math.floor(destheight * 1/3) * 2)  + (Math.floor(destheight * 1/5) * 2), destwidth, destheight
        )
        fxctx.filter = `saturate(0) invert(1) brightness(${52+24}%) contrast(150%) contrast(150%) contrast(150%)`
        fxctx.drawImage(
          canvas, 
          0, Math.floor((destheight * 1/5) * 4), destwidth, destheight, 
          0, (Math.floor(destheight * 1/3) * 2)  + (Math.floor(destheight * 1/5) * 3), destwidth, destheight
        )
      }
      else {
        fxctx.filter = `saturate(0) brightness(${52+12}%) contrast(150%) contrast(150%)`
        fxctx.drawImage(
          canvas, 
          0, Math.floor((destheight * 1/5) * 4), destwidth, destheight, 
          0, (Math.floor(destheight * 1/3) * 2) , destwidth, destheight
        )
        fxctx.filter = `saturate(0) brightness(${52+15}%) contrast(150%) contrast(150%)`
        fxctx.drawImage(
          canvas, 
          0, Math.floor((destheight * 1/5) * 4), destwidth, destheight, 
          0, (Math.floor(destheight * 1/3) * 2)  + (Math.floor(destheight * 1/5) * 1), destwidth, destheight
        )
        fxctx.filter = `saturate(0) brightness(${52+18}%) contrast(150%) contrast(150%)`
        fxctx.drawImage(
          canvas, 
          0, Math.floor((destheight * 1/5) * 4), destwidth, destheight, 
          0, (Math.floor(destheight * 1/3) * 2)  + (Math.floor(destheight * 1/5) * 2), destwidth, destheight
        )
        fxctx.filter = `saturate(0) brightness(${52+24}%) contrast(150%) contrast(150%)`
        fxctx.drawImage(
          canvas, 
          0, Math.floor((destheight * 1/5) * 4), destwidth, destheight, 
          0, (Math.floor(destheight * 1/3) * 2)  + (Math.floor(destheight * 1/5) * 3), destwidth, destheight
        )
      }
      fxctx.restore()
      const ldata = fxctx.getImageData(0,0,fxwidth,fxheight).data
      const fullsizeblob = new Blob([ldata], {type: "octet/stream"})
      const fullsizebloburl = URL.createObjectURL(fullsizeblob)
      outbound.fullsize = fullsizebloburl
      if (debug > 0) {
        outbound.thumb = details.thumb.url
      }
      outbound.id = id
      details.ocrad.fullsize.width = fxwidth
      details.ocrad.fullsize.height = fxheight
      details.ocrad.fullsize.url = fullsizebloburl
      
      worker.postMessage({
        id,
        details
      })
      return null
    }
    
    if (typeof fullsizeurl === "object") {
      imgloaded(fullsizeurl)
      return null
    }
    let img = new Image()
    img.onload = () => {
      imgloaded(img)
    }
    img.onerror = () => {
      details.error = "fullsize load error"
      response(id, false, details)
      setTimeout(()=>{
        workerqueue.resume()
      },0)
    }
    img.src = fullsizeurl
  }
  
  const guessthumb = function(details) {
    try {
      if (details.evaluations.header 
        && details.evaluations.header.verticalLineRightTest
        && details.evaluations.header.verticalLineLeftTest
        && details.evaluations.header.horizontalLineRightTest
        && details.evaluations.header.horizontalLineLeftTest
        && details.evaluations.header.deltaPredominant > 0.15
        && details.evaluations.header.deltaNon > 0.09
        && details.evaluations.header.rightPredominantToSumRatio > 0.56
        && details.evaluations.header.rightPredominantColor !== null
        && details.evaluations.textcolor
        && details.evaluations.textcolor.footer
        && details.evaluations.textcolor.footer.primaryColor === details.evaluations.header.rightPredominantColor
        && details.evaluations.textcolor.footer.primaryRatio > 0.56) {
        details.guess = true
        return true
      }
      details.guess = false
      return false
    }
    catch(e) {
      details.guess = undefined
      return false
    }
  }
  
  const buildthumbblob = function(details) {
    const tdata = details.thumb.debugContext.getImageData(
      0,
      0,
      details.thumb.debugCanvas.width,
      details.thumb.debugCanvas.height
    ).data
    const thumbblob = new Blob([tdata], {type: "octet/stream"})
    const thumbblobburl = URL.createObjectURL(thumbblob)
    details.thumb.url = thumbblobburl
    details.thumb.debugContext = null
    details.thumb.debugCanvas = null
    details.thumb.width = details.thumb.newWidth
    details.thumb.height = details.thumb.newHeight
    delete details.thumb.newWidth
    delete details.thumb.newHeight
    delete details.thumb.debugContext
    delete details.thumb.debugCanvas
    return null
  }

  const workerqueue = new Queue(evalfullsize)

  const init = function(id, thumb, fullsizeurl) {
    const {istwitter, proceed, details, invert} = evalthumb(thumb)
    if (debug > 0) {
      buildthumbblob(details)
    }
    if (istwitter) {
      return response(id, istwitter, details)
    }
    if (!proceed) {
      return response(id, false, details)
    }
    if (!fullsizeurl && thumb.width < 500) {
      const guess = guessthumb(details)
      return response(id, guess, details)
    }
    else if (!fullsizeurl && thumb.width >= 500) {
      workerqueue.push({id, fullsizeurl: thumb, details, invert})
    }
    else {
      workerqueue.push({id, fullsizeurl, details, invert})
    }
    return null
  }

  worker.onmessage = function(e) {
    let response = e.data
    if (response && response.type && response.type === "ocradresponse") {
      let data = response.data
      let id = data.id
      let text = data.text
      let details = data.details
      ocradresponse(id, text, details)
    }
  }
  
  worker.onerror = function(err) {
    console.error(err)
    response(outbound.id, false, {error:"ocrad error"})
    URL.revokeObjectURL(outbound.thumb)
    URL.revokeObjectURL(outbound.fullsize)
    outbound.thumb = null
    outbound.fullsize = null
    outbound.id = null
    setTimeout(()=>{
      workerqueue.resume()
    },0)    
  }

  this.request = function(thumb, fullsizeurl) {
    const id = ++uid
    times[id] = performance.now()
    return new Promise((resolve, reject) => {
      promises[id] = {resolve, reject}
      setTimeout(()=>{
        init(id, thumb, fullsizeurl)
      },0)
    })
  }
  
}