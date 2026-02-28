export default defineAppConfig({
  ui: {
    colors: {
      primary: 'amber',
      neutral: 'slate',
    },
  },
  wanderdebate: {
    agents: {
      flaneur: {
        label: 'The Flaneur',
        shortLabel: 'Slow',
        color: 'emerald', // muted sage green
        icon: 'i-lucide-footprints',
      },
      completionist: {
        label: 'The Completionist',
        shortLabel: 'Fast',
        color: 'blue', // crisp blue
        icon: 'i-lucide-list-checks',
      },
      master: {
        label: 'The Arbitrator',
        shortLabel: 'Master',
        color: 'slate', // neutral slate
        icon: 'i-lucide-scale',
      },
    },
  },
})
