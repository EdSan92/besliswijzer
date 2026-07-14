<script setup lang="ts">
const { register } = useRevealOnScroll()
</script>

<template>
  <section class="editorial-split">
    <div class="landing-container">
      <div
        :ref="(el) => register(el)"
        class="landing-reveal editorial-split__grid"
      >
        <div class="editorial-split__text">
          <h2 class="landing-heading">
            Vergelijk niet langer tientallen producten
          </h2>
          <p class="landing-body">
            Of je nu een robotmaaier, warmtepomp of nieuwe tv zoekt — de keuze is groot
            en de specificaties verwarrend. Veraio helpt je sneller naar een concrete keuze.
          </p>
          <p class="landing-body">
            Beantwoord gerichte vragen over jouw situatie. Wij wegen de opties af
            en geven je één helder advies terug — met uitleg, zodat je begrijpt waarom.
          </p>
          <ul class="editorial-split__list">
            <li>Geen account of nieuwsbrief</li>
            <li>Onafhankelijk — geen merk dat wint</li>
            <li>Klaar in ongeveer 2 minuten</li>
          </ul>
        </div>

        <figure class="editorial-split__figure">
          <img
            src="https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=900&q=80"
            alt="Tuin met gazon — waar een robotmaaier aan werkt"
            width="900"
            height="600"
            loading="lazy"
          />
          <figcaption class="editorial-split__caption">
            Keuzehulpen voor alles wat je thuis en in de tuin koopt
          </figcaption>
        </figure>
      </div>
    </div>
  </section>
</template>

<style scoped>
.editorial-split {
  padding: 5rem 0;
}

.editorial-split__grid {
  display: grid;
  gap: 3rem;
  align-items: center;
}

.editorial-split__text .landing-body + .landing-body {
  margin-top: 1rem;
}

.editorial-split__list {
  margin: 1.75rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.625rem;
}

.editorial-split__list li {
  font-size: 0.9375rem;
  color: var(--veraio-text);
  padding-left: 1.25rem;
  position: relative;
}

.editorial-split__list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--veraio-text);
}

.editorial-split__figure {
  margin: 0;
}

.editorial-split__figure img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--veraio-radius-lg);
  aspect-ratio: 3 / 2;
  object-fit: cover;
}

.editorial-split__caption {
  margin-top: 0.75rem;
  font-size: 0.8125rem;
  color: var(--veraio-muted);
  text-align: center;
}

@media (min-width: 900px) {
  .editorial-split__grid {
    grid-template-columns: 1fr 1fr;
    gap: 5rem;
  }
}
</style>
