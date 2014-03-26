(function() {

  var loadImg = function(src) {
    var defer = $.Deferred();
    var img = new Image;
    var cleanUp = function() {
      img.onload = img.onerror = null;
    };
    img.onload = function() {
      cleanUp();
      defer.resolve(img);
    };
    img.onerror = function() {
      cleanUp();
      defer.reject(img);
    };
    img.src = src;
    return defer.promise();
  };

  loadImg('../imgs/loading.gif');

  var ImgPlacer = function() {
    var html = $.trim($('#tmpl-imgPlacer').html());
    this.$el = $(html);
    this.$loading = this.$el.find('.imgPlacer__loading');
    this.$img = this.$el.find('.imgPlacer__img');
  };
  ImgPlacer.prototype = {
    putImg: function(imgEl) {
      var self = this;
      self.$img.hide();
      self.removeLoading();
      setTimeout(function() {
        self.$img.append(imgEl).fadeIn(200);
      }, 150);
    },
    toAborted: function() {
      this.$el.addClass('aborted');
    },
    showLoading: function() {
      if(this._loadingRemoved || this._loadingShown) {
        return;
      }
      this._loadingShown = true;
      this.$loading.fadeIn(200);
    },
    removeLoading: function() {
      this._loadingRemoved = true;
      var self = this;
      $.when(self.$loading.fadeOut(200)).done(function() {
        self.$loading.remove();
      });
    }
  };

  $(function() {

    $('.testBlock').each(function(i, el) {
      
      pipeSize = i + 1;

      var pipeline = new $.DeferredPipeline({ pipeSize: pipeSize });
      var $el = $(el);

      var $imgs = $('.imgs', el);

      var imgPlacers = [];

      var addPlacers = function() {
        for (var i=1; i<=20; i+=1) {
          (function(i) {
            var placer = new ImgPlacer();
            imgPlacers.push(placer);
            placer.$el.appendTo($imgs);
            pipeline.add(function() {
              var d = $.Deferred();
              loadImg('../photos/' + i + '.jpg').always(function(img) {
                placer.putImg(img);
                setTimeout(d.resolve, 150);
              });
              return d.promise();
            }, {
              fail: function(failArgs, stats) {
                placer.removeLoading();
                if(stats.aborted) {
                  placer.toAborted();
                }
              }
            });
            if(pipeline.running) {
              placer.showLoading();
            }
          }(i));
        }
      };

      var showLoadings = function() {
        for (var i=0, l=imgPlacers.length; i<l; i+=1) {
          imgPlacers[i].showLoading();
        }
      };

      $el
        .on('click', '.add', function(e) {
          addPlacers();
        })
        .on('click', '.run', function(e) {
          showLoadings();
          pipeline.run();
        })
        .on('click', '.stopAll', function(e) {
          pipeline.stopAll();
        })
        .on('click', '.stopAllWithoutTheLast', function(e) {
          pipeline.stopAllWithoutTheLast();
        })

    });
  });

}());

