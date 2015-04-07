/*!
 * jQuery Browser Plugin 0.0.7
 * https://github.com/gabceb/jquery-browser-plugin
 *
 * Original jquery-browser code Copyright 2005, 2013 jQuery Foundation, Inc. and other contributors
 * http://jquery.org/license
 *
 * Modifications Copyright 2015 Gabriel Cebrian
 * https://github.com/gabceb
 *
 * Released under the MIT license
 *
 * Date: 20-01-2015
 */
!function(e){"function"==typeof define&&define.amd?define(["jquery"],function(r){e(r)}):"object"==typeof module&&"object"==typeof module.exports?module.exports=e(require("jquery")):e(window.jQuery)}(function(e){"use strict";function r(e){void 0===e&&(e=window.navigator.userAgent),e=e.toLowerCase();var r=/(edge)\/([\w.]+)/.exec(e)||/(opr)[\/]([\w.]+)/.exec(e)||/(chrome)[ \/]([\w.]+)/.exec(e)||/(version)(applewebkit)[ \/]([\w.]+).*(safari)[ \/]([\w.]+)/.exec(e)||/(webkit)[ \/]([\w.]+).*(version)[ \/]([\w.]+).*(safari)[ \/]([\w.]+)/.exec(e)||/(webkit)[ \/]([\w.]+)/.exec(e)||/(opera)(?:.*version|)[ \/]([\w.]+)/.exec(e)||/(msie) ([\w.]+)/.exec(e)||e.indexOf("trident")>=0&&/(rv)(?::| )([\w.]+)/.exec(e)||e.indexOf("compatible")<0&&/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(e)||[],o=/(ipad)/.exec(e)||/(ipod)/.exec(e)||/(iphone)/.exec(e)||/(kindle)/.exec(e)||/(silk)/.exec(e)||/(android)/.exec(e)||/(windows phone)/.exec(e)||/(win)/.exec(e)||/(mac)/.exec(e)||/(linux)/.exec(e)||/(cros)/.exec(e)||/(playbook)/.exec(e)||/(bb)/.exec(e)||/(blackberry)/.exec(e)||[],i={},a={browser:r[5]||r[3]||r[1]||"",version:r[2]||r[4]||"0",versionNumber:r[4]||r[2]||"0",platform:o[0]||""};if(a.browser&&(i[a.browser]=!0,i.version=a.version,i.versionNumber=parseInt(a.versionNumber,10)),a.platform&&(i[a.platform]=!0),(i.android||i.bb||i.blackberry||i.ipad||i.iphone||i.ipod||i.kindle||i.playbook||i.silk||i["windows phone"])&&(i.mobile=!0),(i.cros||i.mac||i.linux||i.win)&&(i.desktop=!0),(i.chrome||i.opr||i.safari)&&(i.webkit=!0),i.rv||i.edge){var n="msie";a.browser=n,i[n]=!0}if(i.safari&&i.blackberry){var w="blackberry";a.browser=w,i[w]=!0}if(i.safari&&i.playbook){var s="playbook";a.browser=s,i[s]=!0}if(i.bb){var c="blackberry";a.browser=c,i[c]=!0}if(i.opr){var b="opera";a.browser=b,i[b]=!0}if(i.safari&&i.android){var d="android";a.browser=d,i[d]=!0}if(i.safari&&i.kindle){var t="kindle";a.browser=t,i[t]=!0}if(i.safari&&i.silk){var f="silk";a.browser=f,i[f]=!0}return i.name=a.browser,i.platform=a.platform,i}return window.jQBrowser=r(window.navigator.userAgent),window.jQBrowser.uaMatch=r,e&&(e.browser=window.jQBrowser),window.jQBrowser});