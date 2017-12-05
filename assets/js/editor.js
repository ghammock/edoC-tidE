/** edoC JavaScript
 *  Instantiates the CodeMirror instance and event handlers.
 *  NOTE: Requires jQuery.
 *
 *  Gary Hammock
 *  MIT License
*/

var editor = CodeMirror.fromTextArea(codeBlock, {
  theme: "eclipse",
  mode: "null",
  lineNumbers: true,
  styleActiveLine: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  highlightSelectionMatches: {
    annotateScrollbar: true
  },
  viewportMargin: 1000,
  extraKeys: {
    "Tab": function(cm) {
      var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
      cm.replaceSelection(spaces);
    },
    "Ctrl-N": function() { $('#newButton').trigger('click'); },
    "Ctrl-O": function() { $('#fileToRead').trigger('click'); },
    "Ctrl-S": function() { $('#saveButton').trigger('click'); }
  },
  styleSelectedText: false
});



///////////////////////////////
// Helper functions
////////////////////

/** Get an input color string as a hex RGB value.
 *
 * @param color The string to convert to a hex RGB value.
*/
function colorToHex (color) {
  
  // Input is already RGB
  if (color.substr(0, 1) === '#') {
    return color;
  }
  
  // This ensures that the input contains 'rgb(n, n, n)'.
  var rgbStr = color.match(/(.*?)rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/gi);
  if (rgbStr.length == 0) {
    throw new Error('RGB values not given');
  }
  var channel = rgbStr[0].match(/(\d+)/g);

  var red = parseInt(channel[0]),
      green = parseInt(channel[1]),
      blue = parseInt(channel[2]);

  var rgb = (red << 16) | (green << 8) | blue;
  return '#' + padZero(rgb.toString(16), 6);
}

/** Get the inverse of a RGB color in hex
 *
 *  @param hexColor The RGB color value in hexadecimal notation.
 *         This can either be in 3-digit form (e.g. #d1e) or in 6-digit
 *         form (e.g. #beef13).
*/
function invertColor (hexColor) {
  
  // Peel off the leading '#' if present.
  if (hexColor.indexOf('#') === 0) {
    hexColor = hexColor.slice(1);
  }

  // Convert 3-digit hex to 6-digit hex.
  if (hexColor.length === 3) {
    hexColor =  hexColor[0] + hexColor[0]
              + hexColor[1] + hexColor[1]
              + hexColor[2] + hexColor[2];
  }

  if (hexColor.length !== 6) {
    throw new Error('Invalid hex color format received.');
  }

  // Invert each RGB color channel.
  var red   = (255 - parseInt(hexColor.slice(0, 2), 16)).toString(16),
      green = (255 - parseInt(hexColor.slice(2, 4), 16)).toString(16),
      blue  = (255 - parseInt(hexColor.slice(4, 6), 16)).toString(16);
  
  return '#' + padZero(red) + padZero(green) + padZero(blue);
}

/** Pad a hexadecimal value with a leading zero if required.
 *
 *  @param hexStr The hex string to pad.
 *  @param length The desired length of the hex string (defaults to 2).
*/
function padZero (hexStr, length) {
  length = length || 2;
  var zeros = new Array(length).join('0');
  return (zeros + hexStr).slice(-length);
}

/** Create a formatted string for displaying the number of bytes in the file.
 *
 * @param bytes The number of bytes in the editor/file.
*/
function formatFileSize (bytes) {
  // 1 MB = 1,048,576 Bytes = (1024 B/kB * 1024 kB/MB).
  if (bytes >= 1048576) {
    var megabytes = bytes / 1048576;
    return (Math.round(megabytes * 100) / 100).toString() + "MB";
  }
  
  // 1 kB = 1,024 Bytes.
  else if (bytes >= 1024) {
    var kilobytes = bytes / 1024;
    return (Math.round(kilobytes * 100) / 100).toString() + " kB";
  }
  
  // For anything else, just report the number of Bytes.  No one is going
  // to use a javascript based editor to do anything in the GB range,
  // so we'll leave it at that.
  else {
    return bytes.toString() + " B";
  }
}


$(function() {

  // Variables
  var wrapper = editor.getWrapperElement();
  var $curLine = $('#cursorLine');
  var $curCol = $('#cursorCol');
  var $byteCount = $('#byteCount');
  var $languageSelect = $('#languageDropdown');
  var $themeselect = $('#themeDropdown');
  var $menubar = $('#menubar');
  
  // Define an extended mixed-mode that understands vbscript and
  // leaves mustache/handlebars embedded templates in html mode
  var mixedMode = {
    name: "htmlmixed",
    scriptTypes: [{matches: /\/x-handlebars-template|\/x-mustache/i,
                   mode: null},
                  {matches: /(text|application)\/(x-)?vb(a|script)/i,
                   mode: "vbscript"}]
  };

  /** When the user changes the Language selection option,
   *  load the relevant CodeMirror mode.
  */
  $languageSelect.change(function() {
    var mode = $languageSelect.val();
    if (mode === "htmlmixed")
      editor.setOption("mode", mixedMode);
    else
      editor.setOption("mode", mode);
  });

  /** When the user changes the theme/style option,
   *  switch the theme so CodeMirror will update the CSS link.
  */
  $themeselect.change(function(){
    editor.setOption("theme", $themeselect.val());
  
    // Find a high-contrast color to keep the rule visible.
    var $invert = invertColor(
      colorToHex( $('.CodeMirror').css('background-color') )
    );
  
    var $rule = [];
    $rule.push({color: $invert, column: 80, lineStyle: "dashed"});
    editor.setOption("rulers", $rule);
  });

  $(window).resize(function() {
    var $availableHeight = $(window).height() - $('#menubar').height() - $('#statusBar').height();
    $(wrapper).height(Math.floor(0.8 * $availableHeight) + 'px');
    editor.refresh();
  });
  
  $(document).on('drop', function(event) {
    console.log(event);
  })

  // Window Instantiation.
  $themeselect.trigger('change');
  $(window).trigger('resize');
  $curLine.text(0);
  $curCol.text(0);
  $numBytes = 0;
  $byteCount.text(formatFileSize($numBytes));
  $updateDelay = 300;

  $menubar.data("default", {
    language: "null",
    theme: "eclipse"
  });

  editor.on('cursorActivity', function () {
    $curLine.text(editor.getCursor().line + 1);
    $curCol.text(editor.getCursor().ch);
  })
  
  editor.on('change', function(editor, change) {
    clearTimeout($updateDelay);
    $updateDelay = setTimeout(function() {
      $numBytes = editor.getValue().length;
      $byteCount.text(formatFileSize($numBytes));
    }, 300);
  });

  // The user clicks the 'New' button.
  $('#newButton').click(function () {
    editor.setValue("");
    $('#filename').val("");
    $languageSelect.val($menubar.data("default").language);
    $languageSelect.trigger('change');
    $numBytes = 0;
    $byteCount.text(formatFileSize($numBytes));
  });

  // The user clicks the 'Open file' button.
  $('#fileToRead').change(function() {
    var $input = $(this)[0];
    var $file = $input.files[0];
    var $fname = $file.name.toString();
    $('#filename').val($fname);
    
    var fr = new FileReader();
    fr.onload = (function() {
      return function (e) {
        editor.setValue(e.target.result);
        var $info = CodeMirror.findModeByFileName($fname);
        if (!$info) { $languageSelect.val("null"); }
        else { $languageSelect.val($info.mode); }
        $languageSelect.trigger('change');
        $numBytes = e.total;
        $byteCount.text(formatFileSize($numBytes));
      };
    })($file);

    fr.readAsText($file);
  });

  // The user clicks the 'Save as...' button.
  $('#saveButton').click(function() {
    var $lineEnding = $('#lineEnding').val();

    var $content = "";
    switch ($lineEnding) {
      case "CR":
        $content = editor.getValue("\r");
        break;

      case "LF":
        $content = editor.getValue("\n");
        break;

      default:
        $content = editor.getValue("\r\n");
    }

    var $filename = $('#filename').val(),
        $mime = $languageSelect.find('option:selected').data('mimetype');
    
    var $blob = new Blob([$content], {
      type: $mime.toString() + "; charset=utf-8"
    });

    saveAs($blob, $filename);
  });
})
