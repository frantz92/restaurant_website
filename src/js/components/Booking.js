import {templates, select, settings, classNames} from '../settings.js';
import {utils} from '../utils.js';
import {AmountWidget} from './AmountWidget.js';
import {DatePicker} from './DatePicker.js';
import {HourPicker} from './HourPicker.js';

export class Booking{
  constructor(bookingWrapper){
    const thisBooking = this;

    thisBooking.render(bookingWrapper);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.checkTables();
    thisBooking.initActions();
  }

  render(bookingWrapper){
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = bookingWrapper;
    thisBooking.dom.wrapper.innerHTML = generatedHTML;
    thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
    thisBooking.dom.form = thisBooking.dom.wrapper.querySelector(select.booking.form);
  }

  initWidgets(){
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget (thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget (thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker (thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker (thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });
  }

  getData(){
    const thisBooking = this;

    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);
    const params = {
      booking: [
        endDateParam
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        endDateParam
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam
      ],
    };
    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking,
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent,
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat,
    };

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function([bookingsResponse, eventsCurrentResponse, eventsRepeatResponse]){
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;
    thisBooking.booked = {};

    for(let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      } else {
        thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
      }
    }

    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, tables){
    const thisBooking = this;

    const startHour = utils.hourToNumber(hour);

    if(typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }

    for(let bookedHours = startHour; bookedHours < startHour + duration; bookedHours += 0.5) {
      if (typeof thisBooking.booked[date][bookedHours] == 'undefined') {
        thisBooking.booked[date][bookedHours] = [];
      }
      for(let table of tables){
        thisBooking.booked[date][bookedHours].push(table);
      }
    }
  }

  updateDOM(){
    const thisBooking = this;

    let allAvailable = false;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    if(typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ){
      allAvailable = true;
    }
    for(let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);

      if (!isNaN(tableId)){
        tableId = parseInt(tableId);
      }
      if(!allAvailable && thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)){
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }

      if(table.classList.contains(classNames.booking.tableBooked)){
        table.classList.remove('selected');
      } // in every change of date or time, unselect tables that are booked already (add to CheckTables)
    }
  }

  checkTables(){
    const thisBooking = this;

    for(let table of thisBooking.dom.tables){

      table.addEventListener('click', function(){
        let tableNotAvailable = table.classList.contains(classNames.booking.tableBooked);
        let tableSelected = table.classList.contains(classNames.booking.tableSelected);

        if(!tableNotAvailable && !tableSelected){
          table.classList.add(classNames.booking.tableSelected);
        } else if(tableNotAvailable){
          console.log('Table booked');
        } else if(!tableNotAvailable && tableSelected){
          console.log('Table unselected');
          table.classList.remove(classNames.booking.tableSelected);
        }
      });
    }
  }

  initActions(){
    const thisBooking = this;

    thisBooking.dom.form.addEventListener('submit', function(){
      event.preventDefault();
      thisBooking.sendBooking();
    });
  }

  sendBooking(){
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone).value;
    thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address).value;
    thisBooking.dom.checkboxes = thisBooking.dom.wrapper.querySelectorAll(select.booking.starters);
    thisBooking.dom.tableSelected = thisBooking.dom.wrapper.querySelectorAll(select.booking.tableSelected);

    if(thisBooking.dom.checkboxes[0].checked == true){
      thisBooking.water = true;
    } else {
      thisBooking.water = false;
    }

    if(thisBooking.dom.checkboxes[1].checked == true){
      thisBooking.bread = true;
    } else {
      thisBooking.bread = false;
    }

    const payload = {
      address: thisBooking.dom.address,
      phone: thisBooking.dom.phone,
      date: thisBooking.datePicker.correctValue,
      hour: thisBooking.hourPicker.correctValue,
      people: thisBooking.peopleAmount.correctValue,
      duration: thisBooking.hoursAmount.correctValue,
      starters: {
        water: thisBooking.water,
        bread: thisBooking.bread,
      },
      table: [],
    };

    for(let table of thisBooking.dom.tableSelected){
      let choosenTable = table.getAttribute('data-table');
      let numberOfChoosenTable = parseInt(choosenTable, 10);
      payload.table.push(numberOfChoosenTable);
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function(response){
        return response.json();
      })
      .then(function(parsedResponse){
        console.log('Booking: ', parsedResponse);
      })
      .then(function(){
        thisBooking.getData();
      });
  }
}
