define('application/LayerSwipe', [
  'esri/views/SceneView',
  'esri/Map',
  'esri/core/watchUtils'
], function(SceneView,Map,watchUtils) {
  var Widget = function(options,divId) {
    this._init(options,divId);
  };
  Widget.prototype = {
    _init: function(options,divId) {
      $.extend(this,options);
      this.divId = divId;
    },
    /**
     * 启动
     */
    startup:function(){
      var _self = this;
      _self.destroy();
      //创建卷帘地图
      _self._createSwipeView();
      //创建卷帘条
      _self._cretaeSwipeLine();
    },
    /**
     * 创建对比地图
     */
    _createSwipeView: function(){
      var _self = this;
      var view = this.view;
      var viewDiv = "<div id ='swipeViewDiv' class='swipeView'></div>";
      $(document.body).append(viewDiv); 
      var swipeMap = new Map();
      swipeMap.basemap = view.map.basemap;
      swipeMap.ground = view.map.ground;
      swipeMap.addMany(view.map.layers);
      /********以上代码保持两个地图一致*********/
      var swipeView = new SceneView({
        map: swipeMap,
        container: "swipeViewDiv",
        environment: view.environment,
        camera:view.camera,
        extent:view.extent
      });
      swipeMap.addMany(this.layers);
      
      this._synchronizeViews([view, swipeView]);
    },
    /**
     * 同步视图
     */
    _synchronizeView : function(view, others){
      //同步两个地图的方法——————————————————————————————————————————————————————————————————————————————————————————————————————————————————
      others = Array.isArray(others) ? others : [others];
      var viewpointWatchHandle;
      var viewStationaryHandle;
      var otherInteractHandlers;
      var scheduleId;
      var clear = function () {
        if (otherInteractHandlers) {
          otherInteractHandlers.forEach(function (handle) {
            handle.remove();
          });
        }
        viewpointWatchHandle && viewpointWatchHandle.remove();
        viewStationaryHandle && viewStationaryHandle.remove();
        scheduleId && clearTimeout(scheduleId);
        otherInteractHandlers = viewpointWatchHandle =
          viewStationaryHandle = scheduleId = null;
      };

      var interactWatcher = view.watch('interacting,animation',
        function (newValue) {
          if (!newValue) {
            return;
          }
          if (viewpointWatchHandle || scheduleId) {
            return;
          }
          // start updating the other views at the next frame
          scheduleId = setTimeout(function () {
            scheduleId = null;
            viewpointWatchHandle = view.watch('viewpoint',
              function (newValue) {
                others.forEach(function (otherView) {
                  otherView.viewpoint = newValue;
                });
              });
          }, 0);
          // stop as soon as another view starts interacting, like if the user starts panning
          otherInteractHandlers = others.map(function (otherView) {
            return watchUtils.watch(otherView,
              'interacting,animation',
              function (
                value) {
                if (value) {
                  clear();
                }
              });
          });
          // or stop when the view is stationary again
          viewStationaryHandle = watchUtils.whenTrue(view,
            'stationary', clear);
        });
      return {
        remove: function () {
          this.remove = function () { };
          clear();
          interactWatcher.remove();
        }
      }
    },
    _synchronizeViews : function (views) {
      var _self = this;
      var handles = views.map(function (view, idx, views) {
        var others = views.concat();
        others.splice(idx, 1);
        return _self._synchronizeView(view, others);
      });
      return {
        remove: function () {
          this.remove = function () { };
          handles.forEach(function (h) {
            h.remove();
          });
          handles = null;
        }
      }
    },
    /**
     * 创建滑动轴
     */
    _cretaeSwipeLine : function(){
      var $map = $('#'+this.divId);
      var swipeLineTplHtml = "";
      if(this.type == "vertical"){
        swipeLineTplHtml = 
        '<div class="vertical-slider all-slider">'+
          '<div class="handle"></div>'+
        '</div>';
        $('#swipeViewDiv').css('clip', 'rect(0px ' + $map.width()/2 + 'px ' + $map.height() + 'px 0px)');
      }else if(this.type == "horizontal"){
        swipeLineTplHtml = 
        '<div class="horizontal-slider all-slider">'+
          '<div class="handle"></div>'+
        '</div>';
        $('#swipeViewDiv').css('clip', 'rect(0px ' + $map.width() + 'px ' + $map.height()/2 + 'px 0px)');
      }
      $('#'+this.divId).append(swipeLineTplHtml);
      
      
      this._bindEvent();
    },
    /**
     * 绑定事件
     */
    _bindEvent : function(){
      var _self = this;
      var $slider = $('.all-slider');
      var isSelected = false;
      var $selectEle = null;
      var $map = $('#'+this.divId);
      $slider.unbind('mousedown').on('mousedown', function () {
        isSelected = true;
        _self.resetLocation()
        $('.all-slider').css('opacity', 0);
        $(this).css('opacity', 1);
        $selectEle = $(this);
      });
      $slider.unbind('mouseup').on('mouseup', function () {
        isSelected = false;
      });
      $map.on('mousemove', function (evt) {
        var $swipeViewDiv = $('#swipeViewDiv');
        if (isSelected) {
          evt.preventDefault();
          if ($selectEle.hasClass('vertical-slider')) {
            $selectEle.css('left', evt.clientX + 'px');
            $swipeViewDiv.css('clip', 'rect(0px ' + evt.clientX + 'px ' + $map.height() + 'px 0px)');
          }
          if ($selectEle.hasClass('horizontal-slider')) {
            $selectEle.css('top', evt.clientY + 'px');
            $swipeViewDiv.css('clip', 'rect(0px ' + $map.width() + 'px ' + evt.clientY + 'px 0px)');
          }
        }
      });
    },
    resetLocation:function() {
      var _self = this;
      var $allSlider = $('.all-slider');
      $allSlider.each(function () {
        if ($(this).hasClass('left-vertical-slider')) {
          $(this).css('left', '0px');
        }
        if ($(this).hasClass('right-vertical-slider')) {
          $(this).css('right', '0px');
          $(this).css('left', 'auto');
        }
        if ($(this).hasClass('top-horizontal-slider')) {
          $(this).css('top', '0px');
        }
        if ($(this).hasClass('bottom-horizontal-slider')) {
          $(this).css('bottom', '0px');
          $(this).css('top', 'auto');
        }
      });
    },
    /**
     * 销毁
     */
    destroy:function(){
      $("#swipeViewDiv").remove();
      $(".all-slider").remove();
    }
  }
  return Widget;
})
