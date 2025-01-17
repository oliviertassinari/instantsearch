import {
  createSearchClient,
  createMultiSearchResponse,
  createSingleSearchResponse,
} from '@instantsearch/mocks';
import { wait } from '@instantsearch/testutils';
import { screen } from '@testing-library/dom';
import { history } from 'instantsearch.js/es/lib/routers';
import { simple } from 'instantsearch.js/es/lib/stateMappings';

import type { RefinementListConnectorSetup } from '.';
import type { TestOptions } from '../../common';

export function createRoutingTests(
  setup: RefinementListConnectorSetup,
  { act }: Required<TestOptions>
) {
  describe('routing', () => {
    beforeAll(() => {
      window.history.pushState({}, '', 'http://localhost/');
    });
    afterAll(() => {
      window.history.pushState({}, '', 'http://localhost/');
    });

    describe('URLs created by widget', () => {
      test('Consistently shows the right URL, even before widget is initialized', async () => {
        const delay = 100;
        const margin = 10;
        const attribute = 'brand';
        const router = history();
        const options = {
          instantSearchOptions: {
            indexName: 'indexName',
            routing: {
              stateMapping: simple(),
              router,
            },
            searchClient: createSearchClient({
              search: jest.fn(async (requests) => {
                await wait(delay);
                return createMultiSearchResponse(
                  ...requests.map(() =>
                    createSingleSearchResponse({
                      facets: {
                        [attribute]: {
                          Samsung: 100,
                          Apple: 200,
                        },
                      },
                    })
                  )
                );
              }),
            }),
          },
          widgetParams: { attribute },
        };

        await setup(options);

        // Before widgets are completely mounted
        {
          // Vue doesn't render anything on first render, so we don't need
          // to check that the URL is correct.
          const link = document.querySelector(
            '[data-testid="RefinementList-link"]'
          );
          if (link) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(link).toHaveAttribute(
              'href',
              router.createURL({
                indexName: {
                  refinementList: {
                    [attribute]: ['value'],
                  },
                },
              })
            );
          }
        }

        // Wait for initial results to populate widgets with data
        await act(async () => {
          await wait(margin + delay);
          await wait(0);
        });

        // Initial state, before interaction
        {
          expect(screen.getByTestId('RefinementList-link')).toHaveAttribute(
            'href',
            router.createURL({
              indexName: {
                refinementList: {
                  [attribute]: ['value'],
                },
              },
            })
          );
        }

        // Select a refinement
        {
          const firstItem = screen.getByTestId('RefinementList-refine');
          await act(async () => {
            firstItem.click();
            await wait(0);
            await wait(0);
          });

          // URL has changed immediately after the user interaction
          expect(screen.getByTestId('RefinementList-link')).toHaveAttribute(
            'href',
            router.createURL({
              indexName: {
                refinementList: {
                  [attribute]: ['Apple', 'value'],
                },
              },
            })
          );
        }

        // Wait for new results to come in
        {
          await act(async () => {
            await wait(delay + margin);
          });

          expect(screen.getByTestId('RefinementList-link')).toHaveAttribute(
            'href',
            router.createURL({
              indexName: {
                refinementList: {
                  [attribute]: ['Apple', 'value'],
                },
              },
            })
          );
        }

        // Unselect the refinement
        {
          const firstItem = screen.getByTestId('RefinementList-refine');
          await act(async () => {
            firstItem.click();
            await wait(0);
            await wait(0);
          });

          // URL has changed immediately after the user interaction
          expect(screen.getByTestId('RefinementList-link')).toHaveAttribute(
            'href',
            router.createURL({
              indexName: {
                refinementList: {
                  [attribute]: ['value'],
                },
              },
            })
          );
        }

        // Wait for new results to come in
        {
          await act(async () => {
            await wait(delay + margin);
            await wait(0);
          });

          expect(screen.getByTestId('RefinementList-link')).toHaveAttribute(
            'href',
            router.createURL({
              indexName: {
                refinementList: {
                  [attribute]: ['value'],
                },
              },
            })
          );
        }
      });
    });
  });
}
