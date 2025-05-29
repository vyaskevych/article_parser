/*!
 * Lunr languages, `Ukrainian` language
 * https://github.com/MihaiValentin/lunr-languages
 *
 * Copyright 2021, Mihai Valentin
 * http://www.mozilla.org/MPL/
 */
/*!
 * based on
 * Snowball JavaScript Library v0.3
 * http://code.google.com/p/urim/
 * http://snowball.tartarus.org/
 *
 * Copyright 2010, Oleg Mazko
 * http://www.mozilla.org/MPL/
 */

/**
 * export the module via AMD, CommonJS or as a browser global
 * Export code from https://github.com/umdjs/umd/blob/master/returnExports.js
 */
;
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory)
  } else if (typeof exports === 'object') {
    /**
     * Node. Does not work with strict CommonJS, but
     * only CommonJS-like environments that support module.exports,
     * like Node.
     */
    module.exports = factory()
  } else {
    // Browser globals (root is window)
    factory()(root.lunr);
  }
}(this, function () {
  /**
   * Just return a value to define the module export.
   * This example returns an object, but the module
   * can return a function as the exported value.
   */
  return function(lunr) {
    /* throw error if lunr is not yet included */
    if ('undefined' === typeof lunr) {
      throw new Error('Lunr is not present. Please include / require Lunr before this script.');
    }

    /* throw error if lunr stemmer support is not yet included */
    if ('undefined' === typeof lunr.stemmerSupport) {
      throw new Error('Lunr stemmer support is not present. Please include / require Lunr stemmer support before this script.');
    }

    /* register language specific functions */
    lunr.uk = function () {
      this.pipeline.reset();
      this.pipeline.add(
        lunr.uk.trimmer,
        lunr.uk.stopWordFilter,
        lunr.uk.stemmer
      );

      // for lunr version 2
      if (this.searchPipeline) {
        this.searchPipeline.reset();
        this.searchPipeline.add(lunr.uk.stemmer);
      }
    };

    /* lunr trimmer function */
    lunr.uk.wordCharacters = "А-Яа-яЁёІіЇїЄєҐґ";
    lunr.uk.trimmer = lunr.trimmerSupport.generateTrimmer(lunr.uk.wordCharacters);

    lunr.Pipeline.registerFunction(lunr.uk.trimmer, 'trimmer-uk');

    /* lunr stemmer function */
    lunr.uk.stemmer = (function() {
      
      /* Простий український стеммер */
      var endings = [
        // Іменникові закінчення
        'ами', 'ями', 'ові', 'еві', 'ах', 'ях', 'ою', 'ею', 'ій', 'ою', 'на', 'ова', 'ева', 'ська', 'цька',
        // Прикметникові закінчення  
        'ними', 'ним', 'них', 'ній', 'ною', 'нім', 'ний', 'них', 'ні', 'ну', 'не',
        // Дієслівні закінчення
        'ували', 'ювали', 'ували', 'ивали', 'ував', 'ював', 'ував', 'ивав', 'ати', 'яти', 'ути', 'ити',
        // Загальні закінчення
        'ості', 'ість', 'енн', 'нн', 'ть', 'ов', 'ев', 'ах', 'ів', 'ів', 'ам', 'ям', 'ом', 'ем', 'им', 'їм',
        'и', 'і', 'у', 'ю', 'о', 'е', 'а', 'я', 'ь'
      ];

      // Сортуємо закінчення за довжиною (спочатку довші)
      var sortedEndings = endings.slice().sort(function(a, b) {
        return b.length - a.length;
      });

      return function(token) {
        // Отримуємо текст з токена
        var word = token.toString();
        
        // Конвертуємо в нижній регістр
        word = word.toLowerCase();
        
        // Не обробляємо слова коротші за 4 символи
        if (word.length < 4) {
          return token.update(function() { return word; });
        }
        
        // Пробуємо знайти і видалити закінчення
        for (var i = 0; i < sortedEndings.length; i++) {
          var ending = sortedEndings[i];
          if (word.length > ending.length && word.endsWith(ending)) {
            var stem = word.slice(0, -ending.length);
            // Не повертаємо занадто короткі основи
            if (stem.length >= 2) {
              return token.update(function() { return stem; });
            }
          }
        }
        
        return token.update(function() { return word; });
      };
    })();

    lunr.Pipeline.registerFunction(lunr.uk.stemmer, 'stemmer-uk');

    /* stop word filter function */
    lunr.uk.stopWordFilter = lunr.generateStopWordFilter(
      'а але ані б би в вас ваш ваша ваше ваші вже він вона воно вони всі все всім всю г да де для до його її їх їхній з за зо і із к як які крізь на над нам нас наш наша наше наші не неї ним них ніж ні об од або па по при про с та те того тому тій ту у уже цей цим це цих ця ці я'.split(' ')
    );

    lunr.Pipeline.registerFunction(lunr.uk.stopWordFilter, 'stopWordFilter-uk');

    /* export the particular language */
    lunr.uk.Pipeline = {
      'trimmer': lunr.uk.trimmer,
      'stopWordFilter': lunr.uk.stopWordFilter,
      'stemmer': lunr.uk.stemmer
    };
    
    return lunr.uk;
  };
}));