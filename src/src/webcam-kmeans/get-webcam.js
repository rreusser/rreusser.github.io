var getUserMedia = require('getusermedia')

module.exports = function getWebcam(cb) {
  getUserMedia({
    video: true,
    audio: false
  }, function (err, stream) {
    if (err) return cb && cb(err);
    var video = document.createElement('video');
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      video.play()
      return cb && cb(null, video)
    })
  })
}
