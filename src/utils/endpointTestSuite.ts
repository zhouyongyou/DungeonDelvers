// 智能端點測試套件
import { gql } from '@apollo/client';
import { subgraphConfig } from '../config/subgraphConfig';
import { getApolloClient } from '../api/graphqlClient';
import { logger } from './logger';

interface TestResult {
  success: boolean;
  message: string;
  duration?: number;
  endpoint?: string;
}

export class EndpointTestSuite {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    this.results = [];
    
    console.log('🧪 Starting Smart Endpoint Test Suite...');
    
    await this.testEndpointSelection();
    await this.testDataAvailability();
    await this.testApolloIntegration();
    await this.testPerformanceMetrics();
    
    this.printSummary();
    return this.results;
  }

  private async testEndpointSelection() {
    try {
      const start = Date.now();
      const optimalEndpoint = await subgraphConfig.getOptimalEndpoint();
      const duration = Date.now() - start;
      
      this.addResult({
        success: true,
        message: `Endpoint selection works (${duration}ms)`,
        duration,
        endpoint: optimalEndpoint.includes('studio') ? 'Studio' : 'Network'
      });
    } catch (error) {
      this.addResult({
        success: false,
        message: `Endpoint selection failed: ${error}`
      });
    }
  }

  private async testDataAvailability() {
    try {
      const studioUrl = await subgraphConfig.getStudioUrl();
      const decentralizedUrl = await subgraphConfig.getDecentralizedUrl();
      
      const studioTest = await this.testEndpointData(studioUrl, 'Studio');
      const networkTest = await this.testEndpointData(decentralizedUrl, 'Network');
      
      this.addResult(studioTest);
      this.addResult(networkTest);
    } catch (error) {
      this.addResult({
        success: false,
        message: `Data availability test failed: ${error}`
      });
    }
  }

  private async testEndpointData(url: string, name: string): Promise<TestResult> {
    try {
      const start = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ players(first: 1) { id } _meta { block { number } } }'
        }),
        signal: AbortSignal.timeout(5000)
      });
      
      const duration = Date.now() - start;
      const data = await response.json();
      
      if (data.errors) {
        return {
          success: false,
          message: `${name} has GraphQL errors: ${data.errors[0]?.message}`,
          duration,
          endpoint: name
        };
      }
      
      const hasPlayers = data.data?.players && data.data.players.length > 0;
      const blockNumber = data.data?._meta?.block?.number;
      
      return {
        success: true,
        message: `${name} data OK (${duration}ms, block: ${blockNumber}, players: ${hasPlayers ? 'Yes' : 'No'})`,
        duration,
        endpoint: name
      };
    } catch (error) {
      return {
        success: false,
        message: `${name} connection failed: ${error}`,
        endpoint: name
      };
    }
  }

  private async testApolloIntegration() {
    try {
      const apolloClient = getApolloClient();
      const start = Date.now();
      
      const result = await apolloClient.query({
        query: gql`
          query TestQuery {
            _meta { block { number } }
          }
        `,
        fetchPolicy: 'network-only'
      });
      
      const duration = Date.now() - start;
      const blockNumber = result.data?._meta?.block?.number;
      
      this.addResult({
        success: true,
        message: `Apollo Client integration works (${duration}ms, block: ${blockNumber})`,
        duration
      });
    } catch (error) {
      this.addResult({
        success: false,
        message: `Apollo Client integration failed: ${error}`
      });
    }
  }

  private async testPerformanceMetrics() {
    try {
      const status = subgraphConfig.getPerformanceStatus();
      const hasMetrics = status.studio.lastCheck > 0 || status.decentralized.lastCheck > 0;
      
      this.addResult({
        success: hasMetrics,
        message: hasMetrics ? 
          `Performance metrics available (Studio: ${status.studio.responseTime}ms, Network: ${status.decentralized.responseTime}ms)` :
          'Performance metrics not yet collected'
      });
    } catch (error) {
      this.addResult({
        success: false,
        message: `Performance metrics test failed: ${error}`
      });
    }
  }

  private addResult(result: TestResult) {
    this.results.push(result);
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.message}`);
  }

  private printSummary() {
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Smart endpoint system is working correctly.');
    } else {
      console.warn('⚠️ Some tests failed. Check the logs above for details.');
    }
    
    logger.info('Endpoint test results:', this.results);
  }
}

// 開發環境自動測試
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const testSuite = new EndpointTestSuite();
  
  // 延遲執行，讓應用先初始化
  setTimeout(async () => {
    try {
      await testSuite.runAllTests();
    } catch (error) {
      console.error('Test suite execution failed:', error);
    }
  }, 8000); // 8秒後執行測試
}

export default EndpointTestSuite;