function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  if (jeSmesko) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    sporocilo = preveriZaSlike(sporocilo, klepetApp);
    sporocilo = preveriZaVideo(sporocilo, klepetApp);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

function preveriZaSlike(vhod, klepetApp) {
  var besedilo = vhod.split(" ");
  for (var beseda in besedilo){
    if ((besedilo[beseda].substring(0, 7).toLowerCase() == "http://" || 
         besedilo[beseda].substring(0, 8).toLowerCase() == "https://") && 
    (besedilo[beseda].substring(besedilo[beseda].length - 4, besedilo[beseda].length).toLowerCase() == ".gif" || 
     besedilo[beseda].substring(besedilo[beseda].length - 4, besedilo[beseda].length).toLowerCase() == ".png" || 
     besedilo[beseda].substring(besedilo[beseda].length - 4, besedilo[beseda].length).toLowerCase() == ".jpg"))
    {
      slika = '<img src="' + besedilo[beseda] + '" style="width:200px; position: relative; left: 20px;">';
      klepetApp.prikaziSliko(trenutniKanal, slika);
      $('#sporocila').append(slika);
      $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
    }
  }
  return vhod
}
  
function preveriZaVideo(vhod, klepetApp) {
  var besedilo = vhod.split(" ");
  for (var beseda in besedilo){
    if ((besedilo[beseda].substring(0, 32).toLowerCase() == "https://www.youtube.com/watch?v="))
    {
      video = '<iframe src="https://www.youtube.com/embed/' + besedilo[beseda].substring(32, besedilo[beseda].length) + '" allowfullscreen style="width:200px; height:150px; position: relative; left: 20px;"></iframe>';
      klepetApp.prikaziVideo(trenutniKanal, video);
      $('#sporocila').append(video);
      $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
    }
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  });
  

  socket.on('slika', function (sporocilo) {
    var novElement = sporocilo.slika;
    $('#sporocila').append(novElement);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  });

  socket.on('video', function (sporocilo) {
    $('#sporocila').append(sporocilo.video);
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  });

  socket.on('dregljaj', function (sporocilo) {
  $('#vsebina').jrumble({x: 0,
	                      y: 0,
	                      rotation: 5});
	if (sporocilo.dregljaj)
	{
    $('#vsebina').trigger('startRumble');
	}
	else
	{
	  $('#vsebina').trigger('stopRumble');
	}
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
    
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val('/zasebno "' + $(this).text() + '"');
      $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
