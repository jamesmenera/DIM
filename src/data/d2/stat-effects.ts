export const statEffects = {
  mobility: {
    units: '%',
    values: ['+0', '+4', '+8', '+12', '+16', '+20', '+24', '+28', '+32', '+36', '+40'],
    // Hunter
    classAbility: {
      units: '',
      values: [
        '0:28',
        '0:26',
        '0:25',
        '0:24',
        '0:22',
        '0:20',
        '0:18',
        '0:16',
        '0:13',
        '0:11',
        '0:09',
      ],
    },
  },
  recovery: {
    units: '%',
    values: ['+0', '+3', '+6', '+9', '+11', '+14', '+17', '+23', '+29', '+34', '+43'],
    // Warlock
    classAbility: {
      units: '',
      values: [
        '1:57',
        '1:43',
        '1:31',
        '1:22',
        '1:15',
        '1:08',
        '1:03',
        '0:59',
        '0:51',
        '0:46',
        '0:41',
      ],
    },
  },
  resilience: {
    units: '%',
    values: ['+0', '+1', '+2', '+3', '+4', '+6', '+8', '+10', '+11', '+12', '+13'],
    // Titan
    classAbility: {
      units: '',
      values: [
        '0:52',
        '0:46',
        '0:41',
        '0:37',
        '0:33',
        '0:30',
        '0:28',
        '0:25',
        '0:21',
        '0:17',
        '0:14',
      ],
    },
  },
  intellect: {
    units: '',
    values: [
      '7:12',
      '6:22',
      '5:43',
      '5:00',
      '4:45',
      '4:31',
      '4:18',
      '4:07',
      '4:00',
      '3:52',
      '3:48',
    ],
  },
  discipline: {
    units: '',
    values: [
      '1:43',
      '1:33',
      '1:25',
      '1:22',
      '1:08',
      '0:59',
      '0:51',
      '0:45',
      '0:41',
      '0:37',
      '0:32',
    ],
  },
  strength: {
    units: '',
    values: [
      '1:43',
      '1:33',
      '1:25',
      '1:22',
      '1:08',
      '0:59',
      '0:51',
      '0:45',
      '0:41',
      '0:37',
      '0:32',
    ],
  },
} as const;
