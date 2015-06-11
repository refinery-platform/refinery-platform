describe('Controller: ExternalToolStatusController', function(){

    var ctrl, scope;
    beforeEach(module('refineryExternalToolStatus'));

    beforeEach(inject(function($rootScope, $controller){
        scope = $rootScope.$new();
        ctrl = $controller('ExternalToolStatusController', {$scope: scope});
    }));

    it('external tool status ctrl should exist', function() {
      expect(ctrl).toBeDefined();
    });

		it("setSystemStatus should set the boolean logic for the different status", function(){
			ctrl.setSystemStatus("OK");
			expect(scope.systemStatusOk).toEqual(true);
			expect(
				scope.systemStatusWarning && scope.systemStatusError && scope.systemStatusUnknown )
				.toEqual(false);

			ctrl.setSystemStatus("WARNING");
			expect(scope.systemStatusWarning).toEqual(true);
			expect(
				scope.systemStatusOk && scope.systemStatusUnknown && scope.systemStatusError)
				.toEqual(false);

			ctrl.setSystemStatus("ERROR");
			expect(scope.systemStatusError).toEqual(true);
			expect(
				scope.systemStatusOk && scope.systemStatusUnknown && scope.systemStatusWarning)
				.toEqual(false);


			ctrl.setSystemStatus("UNKNOWN");
			expect(scope.systemStatusUnknown).toEqual(true);
			expect(
				scope.systemStatusOk && scope.systemStatusWarning && scope.systemStatusError)
				.toEqual(false);

		});

});