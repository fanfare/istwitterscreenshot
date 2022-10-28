# istwitterscreenshot
#####
create an instance of istwitterscreenshot:

    const istwitterscreenshot = new Istwitterscreenshot
    
then make as many requests as needed

    const thumbnailURL = "http://localhost/thumbnail.jpg"
    const optionalFullsizeURL = "http://localhost/fullsize.jpg"

    const thumbnail = new Image

    thumbnail.onload = async function() {
      const response = await istwitterscreenshot.request(thumbnail, optionalFullsizeURL)
      console.log(response) // true
    }
    thumbnail.src = thumbURL