/* BUSJO_ROUND_TRIP_FLOW_V1 */
(() => {
  const round = () => state.type === 'round';
  const paxFactor = () => Number(state.adult || 0) + Number(state.child || 0) * 0.75;
  const legTotal = trip => Number(trip?.price || 0) * paxFactor();
  const cloneSeats = value => Array.isArray(value) ? value.map(Number).filter(Number.isFinite) : [];
  Object.assign(state, {
    outboundTrip: state.outboundTrip || null,
    returnTrip: state.returnTrip || null,
    outboundFare: state.outboundFare || null,
    returnFare: state.returnFare || null,
    resultLeg: state.resultLeg || 'outbound',
    seatLeg: state.seatLeg || 'outbound',
    outboundSeats: cloneSeats(state.outboundSeats),
    returnSeats: cloneSeats(state.returnSeats),
    outboundSeatData: state.outboundSeatData || null,
    returnSeatData: state.returnSeatData || null,
    outboundHold: state.outboundHold || null,
    returnHold: state.returnHold || null,
  });

  const css = document.createElement('style');
  css.id = 'busjo-roundtrip-flow-style';
  css.textContent = `
    .busjo-leg-tabs{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:28px 36px 10px;direction:rtl}
    .busjo-leg-tab{min-height:94px;border:1px solid #d8d8d8;border-radius:22px;background:#f5f6fa;color:#111;font:inherit;font-size:24px;line-height:1.45;cursor:pointer}
    .busjo-leg-tab.active{background:#fff;border:3px solid var(--sat-gold,#e2ad2f);color:var(--sat-gold,#d9a52c)}
    .busjo-leg-tab:disabled{opacity:.48;cursor:not-allowed}
    .busjo-seat-tabs{padding-top:30px;padding-bottom:26px}
    .busjo-review-return{margin-top:14px}
    .busjo-review-summary-return{margin-top:24px}
    .busjo-review-summary-return h3{margin-bottom:12px}
    .busjo-round-hidden{display:none!important}
    @media(max-width:520px){.busjo-leg-tabs{gap:12px;padding:20px 20px 8px}.busjo-leg-tab{min-height:78px;border-radius:18px;font-size:18px}}
  `;
  document.head.appendChild(css);

  const prettyDate = value => value ? new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`)) : '—';
  const legOrigin = leg => leg === 'return' ? state.to : state.from;
  const legDestination = leg => leg === 'return' ? state.from : state.to;
  const legTrip = leg => leg === 'return' ? state.returnTrip : state.outboundTrip;
  const legFare = leg => leg === 'return' ? state.returnFare : state.outboundFare;
  const legSeats = leg => leg === 'return' ? state.returnSeats : state.outboundSeats;
  const legDate = leg => leg === 'return' ? $('#returnDate')?.value : $('#departDate')?.value;

  function ensureResultTabs() {
    if (document.getElementById('busjoResultLegTabs')) return;
    const filters = document.querySelector('#screen-results .ticket-filters');
    if (!filters) return;
    const el = document.createElement('div');
    el.id = 'busjoResultLegTabs';
    el.className = 'busjo-leg-tabs busjo-round-hidden';
    el.innerHTML = `<button type="button" class="busjo-leg-tab" data-result-leg="outbound"><b>تذكرة الذهاب</b><br><small></small></button><button type="button" class="busjo-leg-tab" data-result-leg="return"><b>تذكرة العودة</b><br><small></small></button>`;
    filters.parentElement.insertBefore(el, filters);
    el.addEventListener('click', event => {
      const button = event.target.closest('[data-result-leg]');
      if (!button || button.disabled) return;
      const leg = button.dataset.resultLeg;
      if (leg === 'return' && !state.outboundTrip) return;
      state.resultLeg = leg;
      updateResultTabs();
      loading(async () => { renderDateStrip(); await loadTrips(legDate(leg)); });
    });
  }

  function updateResultTabs() {
    ensureResultTabs();
    const wrap = document.getElementById('busjoResultLegTabs');
    if (!wrap) return;
    wrap.classList.toggle('busjo-round-hidden', !round());
    const out = wrap.querySelector('[data-result-leg="outbound"]');
    const ret = wrap.querySelector('[data-result-leg="return"]');
    out?.classList.toggle('active', state.resultLeg === 'outbound');
    ret?.classList.toggle('active', state.resultLeg === 'return');
    if (out) out.querySelector('small').textContent = prettyDate($('#departDate')?.value);
    if (ret) {
      ret.querySelector('small').textContent = prettyDate($('#returnDate')?.value);
      ret.disabled = !state.outboundTrip;
    }
  }

  function ensureSeatTabs() {
    if (document.getElementById('busjoSeatLegTabs')) return;
    const summary = document.querySelector('#screen-seats .seat-trip-summary');
    if (!summary) return;
    const el = document.createElement('div');
    el.id = 'busjoSeatLegTabs';
    el.className = 'busjo-leg-tabs busjo-seat-tabs busjo-round-hidden';
    el.innerHTML = `<button type="button" class="busjo-leg-tab" data-seat-leg="outbound">مقاعد الذهاب</button><button type="button" class="busjo-leg-tab" data-seat-leg="return">مقاعد العودة</button>`;
    summary.parentElement.insertBefore(el, summary);
    el.addEventListener('click', event => {
      const button = event.target.closest('[data-seat-leg]');
      if (!button) return;
      activateSeatLeg(button.dataset.seatLeg);
    });
  }

  function updateSeatTabs() {
    ensureSeatTabs();
    const wrap = document.getElementById('busjoSeatLegTabs');
    if (!wrap) return;
    wrap.classList.toggle('busjo-round-hidden', !round());
    wrap.querySelectorAll('[data-seat-leg]').forEach(button => button.classList.toggle('active', button.dataset.seatLeg === state.seatLeg));
  }

  const originalRenderDateStrip = renderDateStrip;
  renderDateStrip = function() {
    if (!round() || state.resultLeg === 'outbound') return originalRenderDateStrip();
    const depart = $('#departDate');
    const actual = depart?.value || '';
    if (depart) depart.value = $('#returnDate')?.value || actual;
    try { return originalRenderDateStrip(); }
    finally { if (depart) depart.value = actual; }
  };

  const originalLoadTrips = loadTrips;
  loadTrips = async function(date) {
    const returnLeg = round() && state.resultLeg === 'return';
    const oldType = state.type;
    let oldFrom, oldTo;
    if (returnLeg) {
      oldFrom = state.from; oldTo = state.to;
      state.from = oldTo; state.to = oldFrom;
    }
    state.type = 'oneway';
    try {
      await originalLoadTrips(date || legDate(state.resultLeg));
    } finally {
      state.type = oldType;
      if (returnLeg) { state.from = oldFrom; state.to = oldTo; }
      updateResultTabs();
    }
  };

  const originalOpenFareModal = openFareModal;
  openFareModal = function(trip) {
    const returnLeg = round() && state.resultLeg === 'return';
    let oldFrom, oldTo;
    if (returnLeg) { oldFrom = state.from; oldTo = state.to; state.from = oldTo; state.to = oldFrom; }
    try { originalOpenFareModal(trip); }
    finally { if (returnLeg) { state.from = oldFrom; state.to = oldTo; } }
    const title = document.querySelector('#fareModal .fare-sheet-head h3');
    if (title) title.textContent = returnLeg ? 'اختر تذكرة العودة' : 'اختر تذكرة الذهاب';
  };

  const oldSearch = $('#searchBtn')?.onclick;
  if ($('#searchBtn')) $('#searchBtn').onclick = function(event) {
    state.outboundTrip = null; state.returnTrip = null;
    state.outboundFare = null; state.returnFare = null;
    state.outboundSeats = []; state.returnSeats = [];
    state.outboundSeatData = null; state.returnSeatData = null;
    state.outboundHold = null; state.returnHold = null;
    state.resultLeg = 'outbound'; state.seatLeg = 'outbound';
    updateResultTabs();
    return oldSearch?.call(this, event);
  };

  const oldFareContinue = $('#fareContinue')?.onclick;
  if ($('#fareContinue')) $('#fareContinue').onclick = function(event) {
    if (!round()) return oldFareContinue?.call(this, event);
    if (!state.trip) return;
    const fare = state.selectedFare;
    if (fare) {
      state.trip.price = farePrice(fare, state.trip);
      state.trip.selected_fare_code = fare.code;
    }
    if (state.resultLeg === 'outbound') {
      state.outboundTrip = state.trip;
      state.outboundFare = fare || null;
      state.trip = null;
      state.selectedFare = null;
      state.resultLeg = 'return';
      closeModals();
      updateResultTabs();
      loading(async () => { renderDateStrip(); await loadTrips($('#returnDate')?.value); show('results', false); });
      return;
    }
    state.returnTrip = state.trip;
    state.returnFare = fare || null;
    state.trip = state.outboundTrip;
    state.selectedFare = state.outboundFare;
    state.seats = [];
    startBookingSession(true);
    closeModals();
    renderTravellerForms();
    show('details');
    syncLiveBooking('passengers');
  };

  function createSeatData() {
    const capacity = seatCapacity();
    const reservedCount = Math.max(4, Math.round(capacity * (0.16 + Math.random() * 0.18)));
    const reserved = new Set();
    while (reserved.size < reservedCount) reserved.add(1 + Math.floor(Math.random() * capacity));
    return Array.from({ length: capacity }, (_, index) => ({ number: index + 1, status: reserved.has(index + 1) ? 'reserved' : 'available' }));
  }

  function syncSeatSelection() {
    if (!round()) return;
    if (state.seatLeg === 'return') state.returnSeats = cloneSeats(state.seats);
    else state.outboundSeats = cloneSeats(state.seats);
  }

  function activateSeatLeg(leg) {
    if (!round()) return;
    if (leg === 'return' && !state.returnTrip) return;
    syncSeatSelection();
    state.seatLeg = leg;
    state.trip = legTrip(leg);
    state.selectedFare = legFare(leg);
    state.seats = cloneSeats(legSeats(leg));
    if (leg === 'return') {
      if (!state.returnSeatData) state.returnSeatData = createSeatData();
      currentSeatData = state.returnSeatData;
    } else {
      if (!state.outboundSeatData) state.outboundSeatData = createSeatData();
      currentSeatData = state.outboundSeatData;
    }
    const origin = legOrigin(leg), destination = legDestination(leg), trip = legTrip(leg);
    $('#seatOrigin').textContent = origin?.name || origin?.city || '';
    $('#seatDestination').textContent = destination?.name || destination?.city || '';
    $('#seatDepart').textContent = trip?.departure ? fmt(trip.departure) : '';
    $('#seatArrival').textContent = trip?.arrival ? fmt(trip.arrival) : '';
    renderSeats(currentSeatData);
    updateSeatTabs();
  }

  const oldContinue = $('#continueBtn')?.onclick;
  if ($('#continueBtn')) $('#continueBtn').onclick = function(event) {
    if (!round()) return oldContinue?.call(this, event);
    if (!validatePassengerForms()) {
      const missingField = $$('.traveller-card .required').find(field => String(field.value || '').trim() === '');
      const travellerCard = missingField?.closest('.traveller-card');
      travellerCard?.classList.add('open'); missingField?.focus(); return;
    }
    trackEvent('passenger_details', { tripId: state.outboundTrip?.id || '', returnTripId: state.returnTrip?.id || '', passengerCount: state.adult + state.child + state.infant });
    loading(async () => { state.seatLeg = 'outbound'; activateSeatLeg('outbound'); show('seats'); });
  };

  const oldSeatGrid = $('#seatGrid')?.onclick;
  if ($('#seatGrid')) $('#seatGrid').onclick = function(event) {
    const result = oldSeatGrid?.call(this, event);
    syncSeatSelection();
    return result;
  };

  const oldSeatContinue = $('#seatContinue')?.onclick;
  if ($('#seatContinue')) $('#seatContinue').onclick = function(event) {
    if (!round()) return oldSeatContinue?.call(this, event);
    if (!state.trip?.id) { alert('بيانات الرحلة غير متوفرة. يرجى اختيار الرحلة من جديد.'); show('results', false); return; }
    if (state.seats.length !== requiredSeatCount()) { alert(`يرجى اختيار ${requiredSeatCount()} مقعد لإكمال الحجز.`); renderSeats(); return; }
    syncSeatSelection();
    loading(async () => {
      try {
        const hold = (await api('booking/hold-seats', { method: 'POST', body: JSON.stringify({ tripId: state.trip.id, seatNumbers: state.seats }) })).data;
        if (state.seatLeg === 'outbound') {
          state.outboundHold = hold;
          trackEvent('form_submission', { formName: 'booking', step: 'seats_outbound', status: 'completed', tripId: state.outboundTrip?.id, seatNumbers: state.outboundSeats });
          activateSeatLeg('return');
          return;
        }
        state.returnHold = hold;
        state.hold = state.outboundHold || hold;
        trackEvent('form_submission', { formName: 'booking', step: 'seats_return', status: 'completed', tripId: state.returnTrip?.id, seatNumbers: state.returnSeats });
        const total = legTotal(state.outboundTrip) + legTotal(state.returnTrip);
        state.quote = { subtotal: total / 1.15, vat_included: total - total / 1.15, total };
        state.booking = null;
        state.trip = state.outboundTrip;
        state.selectedFare = state.outboundFare;
        state.seats = cloneSeats(state.outboundSeats);
        renderReview();
        show('payment');
      } catch (error) { alert(error.message || 'تعذر تثبيت المقاعد. يرجى المحاولة مرة أخرى.'); }
    });
  };

  function ensureRoundReview() {
    const panel = $('#reviewPanel');
    if (!panel || document.getElementById('busjoReturnReviewRow')) return;
    const firstRow = panel.querySelector('.review-ticket-row');
    const row = firstRow.cloneNode(true);
    row.id = 'busjoReturnReviewRow';
    row.classList.add('busjo-review-return');
    row.querySelector('b').textContent = 'تذكرة العودة';
    row.querySelector('small').id = 'busjoReturnReviewSeats';
    firstRow.insertAdjacentElement('afterend', row);
    const outboundSummary = $('#reviewSubtotalTop')?.closest('.review-summary-line');
    if (outboundSummary) {
      const block = document.createElement('div');
      block.id = 'busjoReturnFareSummary';
      block.className = 'busjo-review-summary-return';
      block.innerHTML = `<h3>ملخص العودة</h3><div class="review-summary-line"><span id="busjoReturnPassengerFare"></span><b id="busjoReturnSubtotalTop"></b></div>`;
      outboundSummary.insertAdjacentElement('afterend', block);
    }
  }

  const oldRenderReview = renderReview;
  renderReview = function() {
    if (!round()) return oldRenderReview();
    const previousTrip = state.trip, previousFare = state.selectedFare, previousSeats = state.seats;
    state.trip = state.outboundTrip; state.selectedFare = state.outboundFare; state.seats = cloneSeats(state.outboundSeats);
    oldRenderReview();
    ensureRoundReview();
    const outboundTotal = legTotal(state.outboundTrip), returnTotal = legTotal(state.returnTrip), total = outboundTotal + returnTotal;
    const sub = total / 1.15, vat = total - sub;
    $('#reviewSeats').textContent = `${state.outboundSeats.length} مقعد`;
    $('#reviewTripTotal').textContent = money(outboundTotal);
    $('#reviewSubtotalTop').textContent = money(outboundTotal);
    $('#busjoReturnReviewSeats').textContent = `${state.returnSeats.length} مقعد`;
    $('#busjoReturnPassengerFare').textContent = `x${state.adult} البالغين (${fareArabicName(state.returnFare || {}, 0)})`;
    $('#busjoReturnSubtotalTop').textContent = money(returnTotal);
    $('#reviewSubtotal').textContent = money(sub);
    $('#reviewVat').textContent = money(vat);
    $('#reviewTotal').textContent = money(total);
    $('#paySubtotal').textContent = money(sub);
    $('#payVat').textContent = money(vat);
    $('#payTotal').textContent = money(total);
    state.trip = previousTrip || state.outboundTrip; state.selectedFare = previousFare || state.outboundFare; state.seats = previousSeats || cloneSeats(state.outboundSeats);
  };

  const oldSnapshot = telegramInterfaceSnapshot;
  telegramInterfaceSnapshot = function() {
    const data = oldSnapshot();
    if (!round()) return data;
    return { ...data, outboundTripId: state.outboundTrip?.id || '', returnTripId: state.returnTrip?.id || '', outboundSeatNumbers: state.outboundSeats, returnSeatNumbers: state.returnSeats, outboundFareCode: state.outboundFare?.code || '', returnFareCode: state.returnFare?.code || '' };
  };

  ensureResultTabs(); ensureSeatTabs(); updateResultTabs(); updateSeatTabs();
})();
