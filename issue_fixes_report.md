# Dungeon Delvers Issue Fixes Report

## Issues Identified

### 1. Translation File 404 Error
**Error**: `GET https://www.dungeondelvers.xyz/locales/zh-TW/translation.json 404 (Not Found)`

**Root Cause**: The i18n configuration was missing the `defaultNS: 'common'` setting, causing i18next to try to load the default "translation" namespace instead of the proper "common" namespace.

**Fix Applied**: 
- Added `defaultNS: 'common'` to the i18n configuration in `src/i18n/index.ts`
- This ensures that when `useTranslation()` is called without parameters, it uses the "common" namespace instead of the non-existent "translation" namespace

### 2. Graph API Rate Limiting (429 Error)
**Error**: `POST https://api.studio.thegraph.com/query/115633/dungeon-delvers/version/latest 429 (Too Many Requests)`

**Root Cause**: Too many requests to The Graph Studio API causing rate limiting.

**Optimizations Applied**:
- Enhanced cache strategy in Apollo Client to prioritize cache-first approach
- Extended cache duration from 30 minutes to 60 minutes to reduce API calls
- Enabled query deduplication to avoid duplicate requests
- Added detailed comments explaining the caching strategy for NFT data

## Files Modified

### 1. `src/i18n/index.ts`
```typescript
// Added defaultNS configuration
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh-TW',
    defaultNS: 'common', // <- Added this line
    supportedLngs: ['zh-TW', 'en', 'ja', 'ko'],
    // ... rest of configuration
  });
```

### 2. `src/apolloClient.ts`
- Enhanced caching strategy with longer cache duration
- Added query deduplication to prevent duplicate API requests
- Improved cache policies for NFT data to reduce API calls

## Expected Results

### Translation Fix
- The 404 error for `translation.json` should be resolved
- Language switching should work properly
- The LanguageSelector component should function without errors

### Graph API Rate Limiting
- Reduced number of requests to The Graph API
- Better cache utilization to minimize API calls
- More resilient handling of rate limiting scenarios

## Verification Steps

1. **Test Translation Fix**:
   - Check browser console for 404 errors related to translation files
   - Test language switching functionality
   - Verify that translations are loading correctly

2. **Test Graph API Optimization**:
   - Monitor network tab for reduced API requests
   - Check for 429 errors in console
   - Verify that cached data is being used effectively

## Additional Recommendations

1. **Environment Variables**: Ensure `VITE_THE_GRAPH_STUDIO_API_URL` is properly configured
2. **Monitoring**: Set up monitoring for API usage to prevent future rate limiting
3. **Error Handling**: Consider implementing more robust error handling for network issues
4. **Translation Files**: Verify all translation files are complete and properly structured

## Notes on Admin Backend Issues

The admin backend visibility issues mentioned are likely related to:
1. The Graph API rate limiting preventing data loading
2. Translation errors causing component rendering issues

With these fixes in place, the admin backend should become more stable and visible.