/**
 * .disableTextSelect - Disable Text Select Plugin
 *
 * Version: 1.1
 * Updated: 2007-11-28
 *
 * Used to stop users from selecting text
 *
 * Copyright (c) 2007 James Dempster (letssurf@gmail.com, http://www.jdempster.com/category/jquery/disabletextselect/)
 *
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 **/
!function(e){e.browser.mozilla?(e.fn.disableTextSelect=function(){return this.each(function(){e(this).css({MozUserSelect:"none"})})},e.fn.enableTextSelect=function(){return this.each(function(){e(this).css({MozUserSelect:""})})}):e.browser.msie?(e.fn.disableTextSelect=function(){return this.each(function(){e(this).bind("selectstart.disableTextSelect",function(){return!1})})},e.fn.enableTextSelect=function(){return this.each(function(){e(this).unbind("selectstart.disableTextSelect")})}):(e.fn.disableTextSelect=function(){return this.each(function(){e(this).bind("mousedown.disableTextSelect",function(){return!1})})},e.fn.enableTextSelect=function(){return this.each(function(){e(this).unbind("mousedown.disableTextSelect")})})}(jQuery);