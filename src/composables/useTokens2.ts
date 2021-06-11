import { ref, computed } from 'vue';
import useTokenLists2 from './useTokenLists2';
import { getAddress } from '@ethersproject/address';
import { TokenInfo } from '@/types/TokenList';
import useConfig from './useConfig';
import TokenService from '@/services/token/token.service';
import useTokenPricesQuery from './queries/useTokenPricesQuery';
import useAccountQuery from './queries/useAccountQuery';
import { TOKENS } from '@/constants/tokens';

// TYPES
type TokenDictionary = { [address: string]: TokenInfo };

// STATE
const injectedTokens = ref<TokenDictionary>({});

export default function useTokens2() {
  // COMPOSABLES
  const { networkConfig } = useConfig();
  const {
    loading: loadingTokenLists,
    failed: tokenListsFailed,
    defaultTokenList: tokenList,
    all: allTokenLists
  } = useTokenLists2();

  // SERVICES
  const tokenService = new TokenService();

  // COMPUTED
  /**
   * Static metadata
   *
   * The baseTokens, injectedTokens and allTokens dictionaries
   * provide the static metadata for each token.
   */
  const baseTokens = computed(
    (): TokenDictionary => {
      if (loadingTokenLists.value || tokenListsFailed.value) return {};

      const baseTokens = {};

      tokenList.value.tokens.forEach(token => {
        const address: string = getAddress(token.address);
        // Don't include if already included
        if (Object.keys(baseTokens).includes(address)) return;
        // Don't include if not on app network
        if (token.chainId !== networkConfig.chainId) return;

        baseTokens[address] = {
          ...token,
          address
        };
      });

      return baseTokens;
    }
  );

  const ether = computed(
    (): TokenDictionary => {
      return { [TOKENS.EthMeta.address]: TOKENS.EthMeta };
    }
  );

  const allTokens = computed(
    (): TokenDictionary => {
      return {
        ...baseTokens.value,
        ...injectedTokens.value
      };
    }
  );

  const allAddresses = computed(() => Object.keys(allTokens.value));

  /**
   * Dynamic metadata
   *
   * The prices, balances and allowances dictionaries provide dynamic
   * metadata for each token in allTokens.
   */
  const pricesQuery = useTokenPricesQuery(allAddresses);
  const accountQuery = useAccountQuery(allAddresses);

  const prices = computed(() =>
    pricesQuery.data.value ? pricesQuery.data.value : {}
  );
  const balances = computed(() =>
    accountQuery.data.value ? accountQuery.data.value.balances : {}
  );
  // const allowances = computed(() =>
  //   accountQuery.data.value ? accountQuery.data.value.allowances : {}
  // );

  // METHODS
  async function injectTokens(addresses: string[]): Promise<void> {
    const tokens = await tokenService.metadata.get(
      addresses,
      allTokenLists.value
    );
    injectedTokens.value = { ...injectedTokens.value, ...tokens };
  }

  return {
    // computed
    allTokens,
    ether,
    prices,
    balances,
    // methods
    injectTokens
  };
}