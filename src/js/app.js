import {Product} from './components/Product.js';
import {Cart} from './components/Cart.js';
import {Booking} from './components/Booking.js';
import {select, settings, classNames} from './settings.js';

const app = {
  initMenu: function(){
    const thisApp = this;

    for(let productData in thisApp.data.products){
      new Product(thisApp.data.products[productData].id, thisApp.data.products[productData]);
    }
  },

  initData: function(){
    const thisApp = this;
    thisApp.data = {};
    const url = settings.db.url + '/' + settings.db.product;
    fetch(url)
      .then(function(rawResponse){
        return rawResponse.json();
      })
      .then(function(parsedResponse){
        //console.log('parsedResponse', parsedResponse);
        thisApp.data.products = parsedResponse;
        thisApp.initMenu();
      });
  },

  initCart: function(){
    const thisApp = this;
    const cartElem = document.querySelector(select.containerOf.cart);
    thisApp.cart = new Cart(cartElem);
    thisApp.productList = document.querySelector(select.containerOf.menu);
    thisApp.productList.addEventListener('add-to-cart', function(event){
      app.cart.add(event.detail.product);
    });
  },

  initPages: function(){
    const thisApp = this;
    thisApp.pages = Array.from(document.querySelector(select.containerOf.pages).children);
    thisApp.navLinks = Array.from(document.querySelectorAll(select.nav.links));
    thisApp.navButton = Array.from(document.querySelectorAll(select.nav.buttons));

    let pagesMatchingHash = [];
    if (window.location.hash > 2){
      const idFromHash = window.location.hash.replace('#/', '');
      pagesMatchingHash = thisApp.pages.filter(function(page){
        return page.id == idFromHash;
      });
    }
    thisApp.activatePage(pagesMatchingHash.length ? pagesMatchingHash[0].id : thisApp.pages[0].id);
    for(let link of thisApp.navLinks){

      link.addEventListener('click', function(event){
        const clickedElement = this;
        event.preventDefault();
        let pageHref = clickedElement.getAttribute('href');
        pageHref = pageHref.substring(1);
        app.activatePage(pageHref);
      });
    }
    for(let button of thisApp.navButton){
      button.addEventListener('click', function(event){
        const clickedElement = this;
        event.preventDefault();
        let pageId = clickedElement.getAttribute('id');
        pageId = pageId.substring(1);
        app.activatePage(pageId);
      });
    }
  },

  activatePage: function(pageId){
    const thisApp = this;
    for(let link of thisApp.navLinks){
      link.classList.toggle(classNames.nav.active, link.getAttribute('href') == '#' + pageId);
    }
    for(let page of thisApp.pages){
      page.classList.toggle(classNames.nav.active, page.getAttribute('id') == pageId);
    }
    window.location.hash = '#' + pageId;

    const pageBody = document.querySelector('body');
    pageBody.setAttribute('class', '');
    pageBody.classList.add(pageId);
    let dotId = 0;
    const dots = document.querySelectorAll('.dot');
    let slideIndex = 0;

    if(pageId == 'home'){

      let timer = setInterval(showSlides, 3000);
      showSlides(slideIndex);

      for(let dot of dots){
        dot.addEventListener('click', function(){
          clearInterval(timer);
          timer = setInterval(showSlides, 3000);
          let dotId = dot.getAttribute('id');
          dotId = parseInt(dotId, 10);
          showSlides(dotId);
        });
      }

      showSlides(dotId);
    }

    function showSlides(dotId){

      const slides = document.getElementsByClassName('slide');

      for (let i = 0; i < slides.length; i++) {
        slides[i].style.display = 'none';
      }

      for (let i = 0; i < dots.length; i++) {
        dots[i].style.opacity = ('0.5');
      }

      slideIndex++;

      if (slideIndex > slides.length) {
        slideIndex = 1;
      }

      if(dotId < 3){
        slideIndex = dotId + 1;
      }

      slides[slideIndex-1].style.display = 'flex';
      dots[slideIndex-1].style.opacity = '1';
    }
  },

  initBooking: function(){
    //const thisApp = this;
    const bookingWrapper = document.querySelector(select.containerOf.booking);
    new Booking(bookingWrapper);
  },

  init: function(){
    const thisApp = this;
    console.log('*** App starting ***');
    //console.log('thisApp:', thisApp);
    //console.log('classNames:', classNames);
    //console.log('settings:', settings);
    //console.log('templates:', templates);
    thisApp.initPages();
    thisApp.initData();
    thisApp.initCart();
    thisApp.initBooking();
  },
};

app.init();
